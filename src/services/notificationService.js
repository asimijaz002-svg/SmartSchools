const eventEmitter = require('../utils/eventEmitter');

// 1. Simulated SMS Integration Gateway Helper
const sendSMS = (phoneNumber, message) => {
  console.log(`\n📱 [SMS DISPATCHED to ${phoneNumber}]: "${message}"`);
};

// 2. Simulated Email Integration Gateway Helper
const sendEmail = (emailAddress, subject, body) => {
  console.log(`✉️ [EMAIL DISPATCHED to ${emailAddress}]: Subject: "${subject}" | Body: "${body}"\n`);
};

// 3. Initialize Decoupled Listeners (Runs on application startup)
const initNotificationListeners = () => {
  
  // Listen for the 'student.admitted' event asynchronously
  eventEmitter.on('student.admitted', (studentData) => {
    try {
      const { first_name, last_name, roll_no, email, class_name } = studentData;
      
      const parentMessage = `Dear Parent, your child ${first_name} ${last_name} has been successfully registered in ${class_name} with Roll No: ${roll_no}. Welcome to our School!`;

      // Simulate sending an SMS to the parent (standard Pak format)
      sendSMS('+92-300-1234567', parentMessage);

      // Simulate sending a confirmation Email to parents
      if (email) {
        sendEmail(email, 'Welcome to School ERP - Admission Confirmation', parentMessage);
      }

    } catch (error) {
      console.error('❌ Failed to process asynchronous notification:', error.message);
    }
  });

  console.log('📣 Event-Driven Notification Listeners Registered Successfully!');
};

module.exports = { initNotificationListeners };