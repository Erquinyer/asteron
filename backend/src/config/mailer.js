import nodemailer from 'nodemailer'

const getTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

export default { sendMail: (...args) => getTransporter().sendMail(...args) }
