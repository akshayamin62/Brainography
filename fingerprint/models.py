from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from flask import current_app
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer as Serializer

db = SQLAlchemy()

class OTPVerification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=2))
    is_verified = db.Column(db.Boolean, default=False)
    attempt_count = db.Column(db.Integer, default=0)

    user = db.relationship('User', backref='otp_verifications')

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def increment_attempt(self):
        self.attempt_count += 1
        db.session.commit()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False) 


    students = db.relationship('Student', backref='user', lazy=True)

    def get_reset_token(self, expires_sec=1800):
        s = Serializer(current_app.config['SECRET_KEY'])
        return s.dumps({'user_id': self.id})

    @staticmethod
    def verify_reset_token(token, expires_sec=1800):
        s = Serializer(current_app.config['SECRET_KEY'])
        try:
            user_id = s.loads(token, max_age=expires_sec)['user_id']
        except Exception:
            return None
        return User.query.get(user_id)

class Agent(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    company = db.Column(db.String(120), nullable=False)
    mobile = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

    # students = db.relationship('Student', backref='agent', lazy=True)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    name = db.Column(db.String(80), nullable=False)
    parent_name = db.Column(db.String(80), nullable=False)
    mobile = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    university = db.Column(db.String(120), nullable=False)
    standard = db.Column(db.String(40), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    dob = db.Column(db.String(20), nullable=False)
    gender = db.Column(db.String(10), nullable=False)

    # # models.py  – add inside Student class
    # def agent_display_name(self):
    #     """Return the agent’s name or 'Unassigned'."""
    #     if not self.agent_id:
    #         return 'Unassigned'

    #     # the User row that owns this student
    #     owner = User.query.get(self.agent_id)
    #     if owner and owner.role == 'agent':
    #         # find the matching Agent row (same e-mail)
    #         ag = Agent.query.filter_by(email=owner.email).first()
    #         return ag.name if ag else owner.username
    #     return 'Unassigned'

    def get_agent_name(self):
        """Return the agent’s display name or 'Unassigned'."""
        if not self.agent_id:
            return 'Unassigned'

        owner = User.query.get(self.agent_id)         # this is a User row
        if not owner or owner.role != 'agent':
            return 'Unassigned'

        # try to show the full name stored in the Agent table;
        # if that row is missing fall back to owner.username
        ag = Agent.query.filter_by(email=owner.email).first()
        return ag.name if ag else owner.username


class Fingerprint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    finger_position = db.Column(db.String(10), nullable=False)  # L1, L2, R1, etc.
    finger_type = db.Column(db.String(10), nullable=False)  # left, right, middle
    image_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('Student', backref='fingerprints')

class StudentDocument(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    student_id  = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'),  nullable=False)
    filename    = db.Column(db.String(255), nullable=False)          # stored name
    original    = db.Column(db.String(255), nullable=False)          # name seen by user
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    student  = db.relationship('Student', backref='documents')
    uploader = db.relationship('User')

