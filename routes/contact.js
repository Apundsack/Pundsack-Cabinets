const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const validator = require('validator');
require('dotenv').config();
const axios = require('axios');

router.get('/contact', (req, res) => {
    res.render('contact');
});

router.post('/contact', async (req, res) => {
    const { name, email, message, honeypot, 'g-recaptcha-response': recaptchaResponse } = req.body;

    // Honeypot check
    if (honeypot) {
        return res.status(400).send('Spam detected');
    }

    // Email validation
    if (!validator.isEmail(email)) {
        return res.status(400).send('Invalid email address');
    }

    // reCAPTCHA verification
    try {
        const recaptchaVerification = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

        if (!recaptchaVerification.data.success || recaptchaVerification.data.score < 0.1) {
            return res.status(400).send('Spam detected by reCAPTCHA.');
        }
    } catch (error) {
        console.error('reCAPTCHA error:', error);
        return res.status(500).send('reCAPTCHA verification failed.');
    }

    // Input sanitization
    const cleanName = validator.escape(name);
    const cleanEmail = validator.escape(email);
    const cleanMessage = validator.escape(message);

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST,
        port: process.env.BREVO_SMTP_PORT,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASS,
        },
    });

    // Email options
    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: process.env.RECIPIENT_EMAIL,
        subject: `Contact Form Submission from ${cleanEmail}`,
        text: `Name: ${cleanName}\nEmail: ${cleanEmail}\nMessage: ${cleanMessage}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            if (error.code === 'EENVELOPE') {
                return res.status(500).send('There was an error with the email address.');
            } else {
                return res.status(500).send('Error sending email.');
            }
        }
        console.log('Email sent:', info.response);
        res.send('Thank you for your message!');
    });
});

module.exports = router;