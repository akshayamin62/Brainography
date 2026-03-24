from flask import Flask, render_template, redirect, url_for, flash, request, jsonify, send_file, abort, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from forms import AgentForm, LoginForm, StudentForm, AgentProfileForm, AgentPasswordResetForm, EmailResetRequestForm, EmailResetVerifyForm, PasswordResetForm, generate_otp, ResendOTPForm, AgentEmailResetRequestForm, AgentEmailResetVerifyForm, AgentResendOTPForm, AgentPasswordResetForm, ForgotPasswordRequestForm, ResetPasswordForm
from models import db, User, Agent, Student, Fingerprint, OTPVerification, StudentDocument
import os
import base64
from datetime import datetime, timedelta
import re
import zipfile
import io
import pytz
from werkzeug.utils import secure_filename
import random

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your_secret_key_here')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Flask-Mail config (use your SMTP credentials)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'mvpatel0204@gmail.com'
app.config['MAIL_PASSWORD'] = 'vdbo cgpb ehba jsol'
mail = Mail(app)
db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

with app.app_context():
    db.create_all()

from functools import wraps
def superadmin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'superadmin':
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def agent_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'agent':
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def superadmin_or_agent_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('login'))
        if current_user.role == 'superadmin':
            return f(*args, **kwargs)

        # agent: allow only if the student really belongs to this agent
        student_id = kwargs.get('student_id')
        if student_id:
            ok = Student.query.filter_by(
                    id=student_id, agent_id=current_user.id).first()
            if ok:
                return f(*args, **kwargs)
        flash('You are not authorised for that student.', 'error')
        return redirect(url_for('agent_dashboard'))
    return wrapper


def student_access_or_404(student_id):
    """Return the Student row or abort(404/403) depending on role."""
    stu = Student.query.get_or_404(student_id)
    if current_user.role == 'agent' and stu.agent_id != current_user.id:
        abort(403)
    return stu

# app.py  (put near the other config lines)
app.config['STUDENT_DOCS_PATH'] = os.path.join(app.root_path, 'uploads', 'student_docs')
os.makedirs(app.config['STUDENT_DOCS_PATH'], exist_ok=True)

@app.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'superadmin':
            return redirect(url_for('superadmin_dashboard'))
        elif current_user.role == 'agent':
            return redirect(url_for('agent_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    from forms import OTPRequestForm
    form = OTPRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            otp = f"{random.randint(100000, 999999)}"
            session['otp'] = otp
            session['otp_email'] = user.email
            # Send OTP via email
            msg = Message(
                subject='Your Login OTP',
                sender=app.config['MAIL_USERNAME'],
                recipients=[user.email]
            )
            msg.body = f"Your OTP is: {otp}"
            mail.send(msg)
            flash('OTP sent to your email.', 'info')
            return redirect(url_for('verify_otp'))
        else:
            flash('Invalid email address.', 'danger')
    return render_template('login_request_otp.html', form=form)

@app.route('/login/verify', methods=['GET', 'POST'])
def verify_otp():
    from forms import OTPVerifyForm
    form = OTPVerifyForm()
    if 'otp' not in session or 'otp_email' not in session:
        flash('Session expired. Please request OTP again.', 'danger')
        return redirect(url_for('login'))
    if form.validate_on_submit():
        if form.otp.data == session.get('otp'):
            user = User.query.filter_by(email=session.get('otp_email')).first()
            if user and check_password_hash(user.password, form.password.data):
                login_user(user)
                # Clean up session
                session.pop('otp')
                session.pop('otp_email')
                # Redirect by role
                if user.role == 'superadmin':
                    return redirect(url_for('superadmin_dashboard'))
                elif user.role == 'agent':
                    return redirect(url_for('agent_dashboard'))
                else:
                    flash('Unauthorized role', 'danger')
                    logout_user()
                    return redirect(url_for('login'))
            else:
                flash('Invalid password.', 'danger')
        else:
            flash('Invalid OTP.', 'danger')
    return render_template('login_verify_otp.html', form=form)

@app.route('/login/resend_otp', methods=['POST'])
def resend_otp():
    if 'otp_email' not in session:
        flash('Session expired. Please request OTP again.', 'danger')
        return redirect(url_for('login'))
    user = User.query.filter_by(email=session.get('otp_email')).first()
    if user:
        otp = f"{random.randint(100000, 999999)}"
        session['otp'] = otp
        # Send OTP via email
        msg = Message(
            subject='Your Login OTP (Resent)',
            sender=app.config['MAIL_USERNAME'],
            recipients=[user.email]
        )
        msg.body = f"Your new OTP is: {otp}"
        mail.send(msg)
        flash('A new OTP has been sent to your email.', 'info')
    else:
        flash('User not found.', 'danger')
    return redirect(url_for('verify_otp'))

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    form = ForgotPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            token = user.get_reset_token()
            reset_link = url_for('reset_password', token=token, _external=True)
            msg = Message(
                subject='Password Reset Request',
                sender=app.config['MAIL_USERNAME'],
                recipients=[user.email]
            )
            msg.body = f"To reset your password, visit the following link:\n{reset_link}\nIf you did not request this, please ignore this email."
            mail.send(msg)
            flash('A password reset link has been sent to your email.', 'info')
        else:
            flash('Email address not found.', 'danger')
    return render_template('forgot_password.html', form=form)

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    form = ResetPasswordForm()
    user = User.verify_reset_token(token)
    if not user:
        flash('Invalid or expired reset link.', 'danger')
        return redirect(url_for('forgot_password'))
    if form.validate_on_submit():
        user.password = generate_password_hash(form.password.data)
        db.session.commit()
        flash('Your password has been reset. Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('reset_password.html', form=form)

@app.route('/superadmin/dashboard')
@login_required
@superadmin_required
def superadmin_dashboard():
    students = Student.query.all()
    return render_template('superadmin_dashboard.html', students=students)

@app.route('/agent/dashboard')
@login_required
@agent_required
def agent_dashboard():
    agent = User.query.filter_by(email=current_user.email).first()
    students = Student.query.filter_by(agent_id=agent.id).all()
    return render_template('agent_dashboard.html', students=students)

@app.route('/agents/add', methods=['GET', 'POST'])
@login_required
@superadmin_required
def add_agent():
    form = AgentForm()
    if form.validate_on_submit():
        password = secrets.token_urlsafe(8)
        hashed_pw = generate_password_hash(password)
        agent = Agent(
            name=form.name.data,
            company=form.company.data,
            mobile=form.mobile.data,
            email=form.email.data,
            password=hashed_pw
        )
        user = User(
            username=form.name.data,
            email=form.email.data,
            password=hashed_pw,
            role='agent'
        )
        db.session.add(agent)
        db.session.add(user)
        db.session.commit()
        # Send email with password and login link
        msg = Message(
            subject='Your Agent Account Details',
            sender=app.config['MAIL_USERNAME'],
            recipients=[form.email.data]
        )
        msg.body = (
            f"Hello {form.name.data},\n\n"
            f"Your account has been created.\n"
            f"Login at: {url_for('login', _external=True)}\n"
            f"Email: {form.email.data}\n"
            f"Password: {password}"
        )
        mail.send(msg)
        flash('Agent added and email sent!', 'success')
        return redirect(url_for('manage_agents'))
    return render_template('add_agent.html', form=form)

@app.route('/agents/manage')
@login_required
@superadmin_required
def manage_agents():
    agents = Agent.query.all()
    return render_template('manage_agents.html', agents=agents)

@app.route('/agents/edit/<int:agent_id>', methods=['GET', 'POST'])
@login_required
@superadmin_required
def edit_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    user = User.query.filter_by(email=agent.email).first()
    form = AgentForm(obj=agent)
    
    if form.validate_on_submit():
        # Update Agent fields
        agent.name = form.name.data
        agent.company = form.company.data
        agent.mobile = form.mobile.data
        agent.email = form.email.data

        # Also update User email if changed
        if user and user.email != form.email.data:
            user.email = form.email.data
        
        db.session.commit()
        flash('Agent updated successfully!', 'success')
        return redirect(url_for('manage_agents'))
    
    # Pre-fill the form with current data
    form.name.data = agent.name
    form.company.data = agent.company
    form.mobile.data = agent.mobile
    form.email.data = agent.email

    return render_template('edit_agent.html', form=form, agent=agent)

@app.route('/agents/delete/<int:agent_id>')
@login_required
@superadmin_required
def delete_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    db.session.delete(agent)
    db.session.commit()
    flash('Agent deleted.', 'info')
    return redirect(url_for('manage_agents'))

@app.route('/students/add', methods=['GET', 'POST'])
@login_required
@superadmin_required
def add_student():
    form = StudentForm()
    agents = Agent.query.all()
    form.agent_id.choices = [(a.id, a.name) for a in agents]

    if form.validate_on_submit():
        # ───────────────────────────────────────────────────────
        selected_agent = Agent.query.get(form.agent_id.data)
        agent_user     = User.query.filter_by(email=selected_agent.email,
                                              role='agent').first()
        # ───────────────────────────────────────────────────────

        student = Student(
            agent_id   = agent_user.id,                 # ← store USER.id
            name       = form.name.data,
            parent_name= form.parent_name.data,
            mobile     = form.mobile.data,
            email      = form.email.data,
            university = form.university.data,
            standard   = form.standard.data,
            address    = form.address.data,
            dob        = form.dob.data.strftime('%Y-%m-%d'),
            gender     = form.gender.data
        )
        db.session.add(student)
        db.session.commit()
        flash('Student added!', 'success')
        return redirect(url_for('manage_students'))

    return render_template('add_student.html', form=form)


@app.route('/students/manage')
@login_required
@superadmin_required
def manage_students():
    students = Student.query.all()
    return render_template('manage_students.html', students=students)

# @app.route('/students/manage')
# @login_required
# @superadmin_required
# def manage_students():
#     students = Student.query.all()
    
#     # Create a comprehensive mapping for agent names
#     agent_names = {}
    
#     # Get all agents and map both Agent.id and User.id to agent names
#     agents = Agent.query.all()
#     for agent in agents:
#         # Map Agent.id to agent name (for super-admin assignments)
#         agent_names[f"agent_{agent.id}"] = agent.name
        
#         # Find corresponding user and map User.id to agent name (for agent self-assignments)
#         user = User.query.filter_by(email=agent.email, role='agent').first()
#         if user:
#             agent_names[f"user_{user.id}"] = agent.name
    
#     return render_template('manage_students.html', students=students, agent_names=agent_names)


@app.route('/students/edit/<int:student_id>', methods=['GET', 'POST'])
@login_required
@superadmin_required
def edit_student(student_id):
    student = Student.query.get_or_404(student_id)
    form = StudentForm(obj=student)  # <-- This pre-fills the form with student data

    # Set choices for select fields (like agent dropdown)
    agents = Agent.query.all()
    form.agent_id.choices = [(a.id, a.name) for a in agents]

    if form.validate_on_submit():
        # Update student data from form
        student.agent_id = form.agent_id.data
        student.name = form.name.data
        student.parent_name = form.parent_name.data
        student.mobile = form.mobile.data
        student.email = form.email.data
        student.university = form.university.data
        student.standard = form.standard.data
        student.address = form.address.data
        student.dob = form.dob.data.strftime('%Y-%m-%d')
        student.gender = form.gender.data
        db.session.commit()
        flash('Student updated!', 'success')
        return redirect(url_for('manage_students'))

    # If GET, ensure fields like agent_id and date are set correctly
    form.agent_id.data = student.agent_id
    if student.dob:
        from datetime import datetime
        try:
            form.dob.data = datetime.strptime(student.dob, '%Y-%m-%d').date()
        except ValueError:
            form.dob.data = None
    else:
        form.dob.data = None

    return render_template('edit_student.html', form=form)


@app.route('/students/delete/<int:student_id>')
@login_required
@superadmin_required
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    flash('Student deleted.', 'info')
    return redirect(url_for('manage_students'))

@app.route('/agent/students/add', methods=['GET', 'POST'])
@login_required
@agent_required
def agent_add_student():
    form = StudentForm()
    # Remove agent_id field for agents
    del form.agent_id
    if form.validate_on_submit():
        # Find agent by email (current_user.email)
        agent = User.query.filter_by(email=current_user.email).first()
        student = Student(
            agent_id=agent.id,
            name=form.name.data,
            parent_name=form.parent_name.data,
            mobile=form.mobile.data,
            email=form.email.data,
            university=form.university.data,
            standard=form.standard.data,
            address=form.address.data,
            dob=form.dob.data.strftime('%Y-%m-%d'),
            gender=form.gender.data
        )
        db.session.add(student)
        db.session.commit()
        flash('Student added!', 'success')
        return redirect(url_for('agent_manage_students'))
    return render_template('agent_add_student.html', form=form)

@app.route('/agent/students/manage')
@login_required
@agent_required
def agent_manage_students():
    agent = User.query.filter_by(email=current_user.email).first()
    students = Student.query.filter_by(agent_id=agent.id).all()
    return render_template('agent_manage_students.html', students=students)

@app.route('/agent/students/edit/<int:student_id>', methods=['GET', 'POST'])
@login_required
@agent_required
def agent_edit_student(student_id):
    agent = User.query.filter_by(email=current_user.email).first()
    student = Student.query.filter_by(id=student_id, agent_id=agent.id).first_or_404()
    form = StudentForm(obj=student)
    del form.agent_id
    if form.validate_on_submit():
        student.name = form.name.data
        student.parent_name = form.parent_name.data
        student.mobile = form.mobile.data
        student.email = form.email.data
        student.university = form.university.data
        student.standard = form.standard.data
        student.address = form.address.data
        student.dob = form.dob.data.strftime('%Y-%m-%d')
        student.gender = form.gender.data
        db.session.commit()
        flash('Student updated!', 'success')
        return redirect(url_for('agent_manage_students'))

    form.name.data = student.name
    form.parent_name.data = student.parent_name
    form.mobile.data = student.mobile
    form.email.data = student.email
    form.university.data = student.university
    form.standard.data = student.standard
    form.address.data = student.address

    # Convert string date back to date object for WTForms
    if student.dob:
        from datetime import datetime
        try:
            form.dob.data = datetime.strptime(student.dob, '%Y-%m-%d').date()
        except ValueError:
            form.dob.data = None
    else:
        form.dob.data = None

    form.gender.data = student.gender
    return render_template('agent_edit_student.html', form=form)

@app.route('/superadmin/profile')
@login_required
@superadmin_required
def superadmin_profile():
    return render_template('superadmin_profile.html')

@app.route('/superadmin/profile/email-reset', methods=['GET', 'POST'])
@login_required
@superadmin_required
def email_reset_request():
    form = EmailResetRequestForm()
    if form.validate_on_submit():
        if form.current_email.data != current_user.email:
            flash('Current email does not match your account email.', 'error')
            return render_template('email_reset_request.html', form=form)
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Delete any existing OTP for this user
        OTPVerification.query.filter_by(user_id=current_user.id).delete()
        
        # Create new OTP record with 2-minute expiration
        current_time = datetime.utcnow()
        expiry_time = current_time + timedelta(minutes=2)  # Changed to 2 minutes
        
        otp_record = OTPVerification(
            user_id=current_user.id,
            email=current_user.email,
            otp_code=otp_code,
            created_at=current_time,
            expires_at=expiry_time
        )
        db.session.add(otp_record)
        db.session.commit()
        
        # Send OTP email
        try:
            msg = Message(
                subject='Email Reset OTP - Admin Panel',
                sender=app.config['MAIL_USERNAME'],
                recipients=[current_user.email]
            )
            msg.body = f"""
Hello {current_user.username},

You have requested to reset your email address. Please use the following OTP to verify your identity:

OTP: {otp_code}

This OTP will expire in 2 minutes.

If you did not request this change, please ignore this email.

Best regards,
Admin Panel Team
            """
            mail.send(msg)
            flash('OTP sent to your current email address! Valid for 2 minutes.', 'success')
            return redirect(url_for('email_reset_verify'))
        except Exception as e:
            flash('Error sending OTP email. Please try again.', 'error')
            return render_template('email_reset_request.html', form=form)
    
    return render_template('email_reset_request.html', form=form)

@app.route('/superadmin/profile/email-verify', methods=['GET', 'POST'])
@login_required
@superadmin_required
def email_reset_verify():
    form = EmailResetVerifyForm()

    otp_record = (
        OTPVerification.query
        .filter_by(user_id=current_user.id)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if otp_record is None:
        flash('No OTP request found. Please request a new OTP.', 'error')
        return redirect(url_for('email_reset_request'))

    if otp_record.is_expired():
        db.session.delete(otp_record)
        db.session.commit()
        flash('OTP has expired. Please request a new OTP.', 'error')
        return redirect(url_for('email_reset_request'))

    form.current_email.data = current_user.email
    otp_verified = otp_record.is_verified

    if request.method == 'POST':

        if form.resend_otp.data:
            new_otp = generate_otp()
            now = datetime.utcnow()
            otp_record.otp_code = new_otp
            otp_record.created_at = now
            otp_record.expires_at = now + timedelta(minutes=2)
            otp_record.attempt_count = 0
            otp_record.is_verified = False
            db.session.commit()

            try:
                msg = Message(
                    'New Email Reset OTP - Admin Panel',
                    sender=app.config['MAIL_USERNAME'],
                    recipients=[current_user.email],
                    body=f'Your new OTP is {new_otp} (valid 2 min).'
                )
                mail.send(msg)
                flash('A new OTP has been sent to your email.', 'success')
            except Exception:
                flash('Failed to send OTP email. Try again.', 'error')

            return redirect(url_for('email_reset_verify'))   

        if form.verify_otp.data:
            otp_entered = form.otp_code.data.strip()

            if otp_entered != otp_record.otp_code:
                otp_record.increment_attempt()
                if otp_record.attempt_count >= 3:
                    db.session.delete(otp_record)
                    db.session.commit()
                    flash('Too many failed attempts. Request a new OTP.', 'error')
                    return redirect(url_for('email_reset_request'))
                flash('Incorrect OTP.', 'error')
                return redirect(url_for('email_reset_verify')) 
            else:
                otp_record.is_verified = True
                db.session.commit()
                flash('OTP verified! Enter your new email.', 'success')
                otp_verified = True                                   

        if form.update_email.data and otp_record.is_verified:
            new_email = form.new_email.data.strip()

            if new_email == current_user.email:
                flash('New email cannot be the same as current email.', 'error')
            elif User.query.filter_by(email=new_email).first():
                flash('This email is already in use.', 'error')
            else:
                current_user.email = new_email
                OTPVerification.query.filter_by(user_id=current_user.id).delete()
                db.session.commit()
                flash('Email updated successfully!', 'success')
                return redirect(url_for('superadmin_profile'))  

    remaining_seconds = max(
        0, int((otp_record.expires_at - datetime.utcnow()).total_seconds())
    )

    return render_template(
        'email_reset_verify.html',
        form=form,
        otp_verified=otp_verified,
        otp_record=otp_record,
        remaining_seconds=remaining_seconds
    )

@app.route('/cleanup-expired-otps')
def cleanup_expired_otps():
    """Clean up expired OTP records"""
    expired_otps = OTPVerification.query.filter(
        OTPVerification.expires_at < datetime.utcnow()
    ).all()
    
    for otp in expired_otps:
        db.session.delete(otp)
    
    db.session.commit()
    return f"Cleaned up {len(expired_otps)} expired OTP records"

@app.route('/superadmin/profile/password-reset', methods=['GET', 'POST'])
@login_required
@superadmin_required
def password_reset():
    form = PasswordResetForm()
    if form.validate_on_submit():
        # Verify current password
        if not check_password_hash(current_user.password, form.current_password.data):
            flash('Current password is incorrect.', 'error')
            return render_template('password_reset.html', form=form)
        
        # Update password
        current_user.password = generate_password_hash(form.new_password.data)
        db.session.commit()
        flash('Password updated successfully!', 'success')
        return redirect(url_for('superadmin_profile'))
    
    return render_template('password_reset.html', form=form)

@app.route('/agent/profile')
@login_required
@agent_required
def agent_profile():
    return render_template('agent_profile.html')

@app.route('/agent/profile/email-reset', methods=['GET', 'POST'])
@login_required
@agent_required
def agent_email_reset_request():
    form = AgentEmailResetRequestForm()
    if form.validate_on_submit():
        if form.current_email.data != current_user.email:
            flash('Current email does not match your account email.', 'error')
            return render_template('agent_email_reset_request.html', form=form)
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Delete any existing OTP for this user
        OTPVerification.query.filter_by(user_id=current_user.id).delete()
        
        # Create new OTP record with 2-minute expiration
        current_time = datetime.utcnow()
        expiry_time = current_time + timedelta(minutes=2)  # Changed to 2 minutes
        
        otp_record = OTPVerification(
            user_id=current_user.id,
            email=current_user.email,
            otp_code=otp_code,
            created_at=current_time,
            expires_at=expiry_time
        )
        db.session.add(otp_record)
        db.session.commit()
        
        # Send OTP email
        try:
            msg = Message(
                subject='Email Reset OTP - Agent Panel',
                sender=app.config['MAIL_USERNAME'],
                recipients=[current_user.email]
            )
            msg.body = f"""
Hello {current_user.username},

You have requested to reset your email address. Please use the following OTP to verify your identity:

OTP: {otp_code}

This OTP will expire in 2 minutes.

If you did not request this change, please ignore this email.

Best regards,
Admin Panel Team
            """
            mail.send(msg)
            flash('OTP sent to your current email address! Valid for 2 minutes.', 'success')
            return redirect(url_for('agent_email_reset_verify'))
        except Exception as e:
            flash('Error sending OTP email. Please try again.', 'error')
            return render_template('agent_email_reset_request.html', form=form)
    
    return render_template('agent_email_reset_request.html', form=form)

@app.route('/agent/profile/email-verify', methods=['GET', 'POST'])
@login_required
@agent_required
def agent_email_reset_verify():
    form = AgentEmailResetVerifyForm()

    otp_record = (
        OTPVerification.query
        .filter_by(user_id=current_user.id)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if otp_record is None:
        flash('No OTP request found. Please request a new OTP.', 'error')
        return redirect(url_for('agent_email_reset_request'))

    if otp_record.is_expired():
        db.session.delete(otp_record)
        db.session.commit()
        flash('OTP has expired. Please request a new OTP.', 'error')
        return redirect(url_for('agent_email_reset_request'))

    form.current_email.data = current_user.email
    otp_verified = otp_record.is_verified

    if request.method == 'POST':

        if form.resend_otp.data:
            new_otp = generate_otp()
            now = datetime.utcnow()
            otp_record.otp_code = new_otp
            otp_record.created_at = now
            otp_record.expires_at = now + timedelta(minutes=2)
            otp_record.attempt_count = 0
            otp_record.is_verified = False
            db.session.commit()

            try:
                msg = Message(
                    'New Email Reset OTP - Agent Panel',
                    sender=app.config['MAIL_USERNAME'],
                    recipients=[current_user.email],
                    body=f'Your new OTP is {new_otp} (valid 2 min).'
                )
                mail.send(msg)
                flash('A new OTP has been sent to your email.', 'success')
            except Exception:
                flash('Failed to send OTP email. Try again.', 'error')

            return redirect(url_for('agent_email_reset_verify'))   

        if form.verify_otp.data:
            otp_entered = form.otp_code.data.strip()

            if otp_entered != otp_record.otp_code:
                otp_record.increment_attempt()
                if otp_record.attempt_count >= 3:
                    db.session.delete(otp_record)
                    db.session.commit()
                    flash('Too many failed attempts. Request a new OTP.', 'error')
                    return redirect(url_for('agent_email_reset_request'))
                flash('Incorrect OTP.', 'error')
                return redirect(url_for('agent_email_reset_verify')) 
            else:
                otp_record.is_verified = True
                db.session.commit()
                flash('OTP verified! Enter your new email.', 'success')
                otp_verified = True                                   

        # ─── UPDATE-EMAIL ─────────────────────────────────────────────────
        if form.update_email.data and otp_record.is_verified:
            new_email = form.new_email.data.strip()
            old_email = current_user.email

            # 1. validations -------------------------------------------------
            if new_email == old_email:
                flash('New e-mail cannot be the same as the current e-mail.', 'error')
            elif User.query.filter_by(email=new_email).first() \
                or Agent.query.filter_by(email=new_email).first():
                flash('This e-mail is already in use.', 'error')
            else:
                try:
                    # 2. write to USER table
                    current_user.email = new_email

                    # 3. write to AGENT table (match by the *old* e-mail)
                    agent_row = Agent.query.filter_by(email=old_email).first()
                    if agent_row:
                        agent_row.email = new_email

                    # 4. clean up OTP rows and commit
                    OTPVerification.query.filter_by(user_id=current_user.id).delete()
                    db.session.commit()

                    flash('E-mail updated successfully!', 'success')
                    return redirect(url_for('agent_profile'))

                except Exception:
                    db.session.rollback()
                    flash('Database error – please try again.', 'error')
 
    remaining_seconds = max(
        0, int((otp_record.expires_at - datetime.utcnow()).total_seconds())
    )

    return render_template(
        'agent_email_reset_verify.html',
        form=form,
        otp_verified=otp_verified,
        otp_record=otp_record,
        remaining_seconds=remaining_seconds
    )

@app.route('/agent/profile/password-reset', methods=['GET', 'POST'])
@login_required
@agent_required
def agent_password_reset():
    form = AgentPasswordResetForm()
    if form.validate_on_submit():
        # Verify current password
        if not check_password_hash(current_user.password, form.current_password.data):
            flash('Current password is incorrect.', 'error')
            return render_template('agent_password_reset.html', form=form)
        
        # Update password
        current_user.password = generate_password_hash(form.new_password.data)
        db.session.commit()
        flash('Password updated successfully!', 'success')
        return redirect(url_for('agent_profile'))
    
    return render_template('agent_password_reset.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/fingerprint/scan/<int:student_id>')
@login_required
def fingerprint_scan_page(student_id):
    student = Student.query.get_or_404(student_id)
    
    # Get existing fingerprints
    existing_prints = {}
    fingerprints = Fingerprint.query.filter_by(student_id=student_id).all()
    for fp in fingerprints:
        key = f"{fp.finger_position}_{fp.finger_type}"
        # The image_path should now contain only the filename
        filename = fp.image_path
        
        # Verify file exists
        full_path = os.path.join('static/fingerprints', filename)
        file_exists = os.path.exists(full_path)
        
        existing_prints[key] = {
            'id': fp.id,
            'filename': filename,
            'file_exists': file_exists,
            'created_at': fp.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    return render_template('fingerprint_scan.html', student=student, existing_prints=existing_prints)

@app.route('/fingerprint/save', methods=['POST'])
@login_required
def save_fingerprint():
    data = request.get_json()
    student_id = data.get('student_id')
    finger_position = data.get('finger_position')
    finger_type = data.get('finger_type')
    image_path = data.get('image_path')
    
    if not all([student_id, finger_position, finger_type, image_path]):
        return jsonify({'success': False, 'message': 'Missing required parameters'})
    
    try:
        # Extract just the filename if a full path was passed
        if '/' in image_path or '\\' in image_path:
            filename = os.path.basename(image_path)
        else:
            filename = image_path
        
        # Check if fingerprint already exists
        existing = Fingerprint.query.filter_by(
            student_id=student_id,
            finger_position=finger_position,
            finger_type=finger_type
        ).first()
        
        if existing:
            # Update existing - store only filename
            existing.image_path = filename
            existing.created_at = db.func.now()
        else:
            # Create new - store only filename
            fingerprint = Fingerprint(
                student_id=student_id,
                finger_position=finger_position,
                finger_type=finger_type,
                image_path=filename
            )
            db.session.add(fingerprint)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Fingerprint saved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'})

@app.route('/fingerprint/delete', methods=['POST'])
@login_required
def delete_fingerprint():
    data = request.get_json()
    fingerprint_id = data.get('fingerprint_id')
    
    try:
        fingerprint = Fingerprint.query.get_or_404(fingerprint_id)
        
        # Delete file if exists
        if os.path.exists(fingerprint.image_path):
            os.remove(fingerprint.image_path)
        
        db.session.delete(fingerprint)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Fingerprint deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error deleting fingerprint: {str(e)}'})

@app.route('/fingerprint/upload', methods=['POST'])
@login_required
def upload_fingerprint():
    """Receive a base64 PNG image captured by the local scanner service
    running on the user's PC, save it to disk, and store the DB record."""
    data = request.get_json()
    student_id = data.get('student_id')
    finger_position = data.get('finger_position')
    finger_type = data.get('finger_type')
    image_data = data.get('image_data')  # base64 PNG string

    if not all([student_id, finger_position, finger_type, image_data]):
        return jsonify({'success': False, 'message': 'Missing required parameters'})

    try:
        # Decode the base64 image
        img_bytes = base64.b64decode(image_data)

        # Build a unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"fingerprint_{student_id}_{finger_position}_{finger_type}_{timestamp}.png"

        os.makedirs('static/fingerprints', exist_ok=True)
        filepath = os.path.join('static', 'fingerprints', filename)

        with open(filepath, 'wb') as f:
            f.write(img_bytes)

        # Upsert fingerprint record
        existing = Fingerprint.query.filter_by(
            student_id=student_id,
            finger_position=finger_position,
            finger_type=finger_type
        ).first()

        if existing:
            # Delete old file if it exists
            old_path = os.path.join('static', 'fingerprints', existing.image_path)
            if os.path.exists(old_path):
                os.remove(old_path)
            existing.image_path = filename
            existing.created_at = datetime.utcnow()
        else:
            fp = Fingerprint(
                student_id=student_id,
                finger_position=finger_position,
                finger_type=finger_type,
                image_path=filename
            )
            db.session.add(fp)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Fingerprint saved successfully.',
            'image_url': f"/static/fingerprints/{filename}"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Upload error: {str(e)}'})


@app.route('/fingerprint/download/<int:student_id>')
@login_required
@superadmin_or_agent_required
def download_student_data(student_id):
    student = Student.query.get_or_404(student_id)
    fingerprints = Fingerprint.query.filter_by(student_id=student_id).all()
    
    # Create a BytesIO object to store the zip file in memory
    memory_file = io.BytesIO()
    
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Create student details text file
        student_details = f"""STUDENT INFORMATION
==================

Student ID: {student.id}
Name: {student.name}
Parent's Name: {student.parent_name}
Mobile: {student.mobile}
Email: {student.email}
University/School: {student.university}
Standard: {student.standard}
Address: {student.address}
Date of Birth: {student.dob}
Gender: {student.gender}
Agent: {student.get_agent_name()}

FINGERPRINT INFORMATION
======================

Total Fingerprints Captured: {len(fingerprints)}

Fingerprint Details:
"""
        
        # Add fingerprint details to text file and collect valid images
        valid_images = []
        for i, fp in enumerate(fingerprints, 1):
            # Build full path to image file
            full_image_path = os.path.join('static', 'fingerprints', fp.image_path)
            file_exists = os.path.exists(full_image_path)
            
            student_details += f"""
{i}. Position: {fp.finger_position}
   Type: {fp.finger_type.title()}
   Captured: {fp.created_at.strftime('%Y-%m-%d %H:%M:%S')}
   File: {fp.image_path}
   Status: {'Available' if file_exists else 'Missing'}
"""
            
            # Add to valid images list if file exists
            if file_exists:
                valid_images.append({
                    'filename': fp.image_path,
                    'full_path': full_image_path,
                    'position': fp.finger_position,
                    'type': fp.finger_type
                })
        
        # Add summary to text file
        student_details += f"""

DOWNLOAD SUMMARY
===============
Total fingerprints in database: {len(fingerprints)}
Successfully downloaded images: {len(valid_images)}
Missing images: {len(fingerprints) - len(valid_images)}

Downloaded on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        # Add student details text file to zip
        zip_file.writestr(f"{student.name.replace(' ', '_')}_details.txt", student_details)
        
        # Add fingerprint images to zip
        if valid_images:
            for img_info in valid_images:
                try:
                    # Create organized filename in zip: fingerprints/position_type.png
                    zip_filename = f"fingerprints/{img_info['position']}_{img_info['type']}.png"
                    zip_file.write(img_info['full_path'], zip_filename)
                except Exception as e:
                    print(f"Error adding {img_info['filename']} to zip: {e}")
        else:
            # If no valid images exist, add a note
            zip_file.writestr("fingerprints/README.txt", 
                            "No fingerprint images were found for this student.\n"
                            "This could be because:\n"
                            "1. No fingerprints have been captured yet\n"
                            "2. Image files have been moved or deleted\n"
                            "3. There was an error during the scanning process")
    
    memory_file.seek(0)
    
    # Create download filename
    download_filename = f"{student.name.replace(' ', '_')}_fingerprint_data.zip"
    
    return send_file(
        memory_file,
        as_attachment=True,
        download_name=download_filename,
        mimetype='application/zip'
    )

# ─── A. list + upload page ───────────────────────────────────────────
@app.route('/students/<int:student_id>/documents', methods=['GET', 'POST'])
@login_required
def student_documents(student_id):
    student = student_access_or_404(student_id)
    if request.method == 'POST':
        pdf = request.files.get('pdf')
        if not pdf or pdf.filename == '' or not pdf.filename.lower().endswith('.pdf'):
            flash('Please choose a PDF file.', 'error')
        else:
            # unique stored filename  (uuid keeps collisions out)
            import uuid
            stored_name = f"{uuid.uuid4().hex}.pdf"
            save_path   = os.path.join(app.config['STUDENT_DOCS_PATH'], stored_name)
            pdf.save(save_path)

            doc = StudentDocument(
                student_id = student.id,
                uploader_id = current_user.id,
                filename  = stored_name,
                original  = pdf.filename
            )
            db.session.add(doc)
            db.session.commit()
            flash('File uploaded.', 'success')
        return redirect(url_for('student_documents', student_id=student.id))

    return render_template('student_documents.html', student=student)

# ─── B. download one PDF ─────────────────────────────────────────────
@app.route('/documents/<int:doc_id>')
@login_required
def get_document(doc_id):
    doc = StudentDocument.query.get_or_404(doc_id)
    student_access_or_404(doc.student_id)          # permission check
    path = os.path.join(app.config['STUDENT_DOCS_PATH'], doc.filename)
    return send_file(path, as_attachment=True, download_name=doc.original)

if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')