from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, TextAreaField, DateField, RadioField
from wtforms.validators import DataRequired, Email, Length, EqualTo
from flask_wtf import FlaskForm
import random
import string

class EmailResetRequestForm(FlaskForm):
    current_email = StringField('Current Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Send OTP')

class ResendOTPForm(FlaskForm):
    resend_otp = SubmitField('Resend OTP')

class EmailResetVerifyForm(FlaskForm):
    current_email = StringField(
        'Current Email',
        validators=[DataRequired(), Email()],
        render_kw={'readonly': True}
    )
    otp_code  = StringField('Enter OTP',  validators=[DataRequired(), Length(min=6, max=6)])
    new_email = StringField('New Email', validators=[DataRequired(), Email()])
    verify_otp = SubmitField('Verify OTP')
    update_email = SubmitField('Update Email')
    resend_otp  = SubmitField('Resend OTP')

class PasswordResetForm(FlaskForm):
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm New Password', 
                                   validators=[DataRequired(), EqualTo('new_password', message='Passwords must match')])
    submit = SubmitField('Update Password')

# Helper function to generate OTP
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


class AgentForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired()])
    company = StringField('Company', validators=[DataRequired()])
    mobile = StringField('Mobile', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Add Agent')


class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')


class StudentForm(FlaskForm):
    # agent choices will be set dynamically in the route
    agent_id = SelectField('Agent', coerce=int, choices=[])
    name = StringField('Student Name', validators=[DataRequired()])
    parent_name = StringField("Parent's Name", validators=[DataRequired()])
    mobile = StringField('Mobile', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    university = StringField('University/School Name', validators=[DataRequired()])
    standard = StringField('Standard', validators=[DataRequired()])
    address = TextAreaField('Residential Address', validators=[DataRequired()])
    dob = DateField('Date of Birth', validators=[DataRequired()], format='%Y-%m-%d')
    gender = RadioField('Gender', choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')], validators=[DataRequired()])
    submit = SubmitField('Add Student')

class AgentProfileForm(FlaskForm):
    current_email = StringField('Current Email', render_kw={'readonly': True})
    new_email     = StringField('New Email', validators=[DataRequired(), Email()])
    verify_otp    = SubmitField('Verify OTP')
    resend_otp    = SubmitField('Resend OTP')
    update_email  = SubmitField('Update Email')

class AgentEmailResetRequestForm(FlaskForm):
    current_email = StringField('Current Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Send OTP')

class AgentResendOTPForm(FlaskForm):
    resend_otp = SubmitField('Resend OTP')

class AgentEmailResetVerifyForm(FlaskForm):
    current_email = StringField(
        'Current Email',
        validators=[DataRequired(), Email()],
        render_kw={'readonly': True}
    )
    otp_code  = StringField('Enter OTP',  validators=[DataRequired(), Length(min=6, max=6)])
    new_email = StringField('New Email', validators=[DataRequired(), Email()])
    verify_otp = SubmitField('Verify OTP')
    update_email = SubmitField('Update Email')
    resend_otp  = SubmitField('Resend OTP')

class AgentPasswordResetForm(FlaskForm):
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm New Password', 
                                   validators=[DataRequired(), EqualTo('new_password', message='Passwords must match')])
    submit = SubmitField('Update Password')

# Helper function to generate OTP
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

class OTPRequestForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Request OTP')

class OTPVerifyForm(FlaskForm):
    otp = StringField('OTP', validators=[DataRequired(), Length(6, 6)])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class ForgotPasswordRequestForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Send Reset Link')

class ResetPasswordForm(FlaskForm):
    password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Reset Password')