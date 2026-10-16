# PawSpa Grooming

- Jaymee Aballe
- INF 242 MWA
- Booking / Reservation System

## Description

PawSpa Grooming is a pet grooming appointment website. Customers can create an account, register pets, choose a service and species-matched groomer, then request an appointment. Salon staff use the admin dashboard to review bookings and manage their progress.

## Features

### Accounts and profile
- Register and log in with an email address and password; phone numbers are not used for registration or login.
- Continue with Google sign-in.
- Remember an email on the login form.
- Update profile details and change a password; password fields have visibility toggles.

### Pet profiles
- Register and edit dogs and cats with species-specific breed options, custom breed entry, size, age, sex, coat, temperament, notes, and an optional photo.
- Enforce a minimum grooming age of 3 months for dogs and 4 months for cats. Age can be entered in years or months and is displayed in whole years/months.
- Add an anti-rabies vaccination date, expiry date, and JPG, PNG, WebP, or PDF record (up to 5 MB).
- Show reminders when a pet's vaccine expiry date has passed, is due today, or has not been recorded. Customers can update a pet's vaccine record from the reminder.

### Appointments
- Choose a pet, grooming service, add-ons, breed-based cut style, date, time, groomer, reminders, and payment method. The total updates with the selected service and add-ons.
- Choose from four cat specialists and four dog specialists; only groomers for the selected pet's species are offered.
- Prevent conflicting bookings from using the same groomer and time slot.
- View appointment statuses and reschedule or request cancellation from My Appointments.
- A cancellation request requires the customer's reason and remains pending until an admin reviews it. Admins can approve it or reject it with an explanation visible to the customer.

### Salon administration and other pages
- The admin dashboard provides appointment search, status filters, summary counts, and actions to accept or decline bookings, start grooming, mark pets ready for pickup, complete appointments, or record a no-show.
- Browse services and pricing, view pet-care facts, check salon open status, read FAQs, and send a demo contact message.
- Responsive layout with a blue-and-yellow visual theme.

## Technologies and data

Built with HTML, CSS, and vanilla JavaScript, using DOM events, classes, localStorage, and the Fetch API.

Customer accounts, pets, bookings, and contact messages are stored in the current browser's localStorage. The booking and admin actions also send requests to JSONPlaceholder as a training/demo API; these requests do not create real salon bookings on a backend. Contact messages are saved locally and are not emailed. Google sign-in uses Google Identity Services.


## Project structure


index.html       Main page structure and the nine app sections
style.css        Responsive layout, forms, and visual theme
data.js          Shared helpers, service/breed/groomer data, classes, and statuses
http.js          Fetch helpers and pet-care facts
config.js        Google sign-in client configuration
auth.js          Session, navigation, account registration, and login
pets.js          Pet registration, editing, photos, vaccine records, and reminders
booking.js       Booking form, calendar, available slots, and rescheduling
appointments.js  Customer appointment list and cancellation requests
account.js       Profile and contact form
admin.js         Admin dashboard and appointment decisions
google.js        Google sign-in integration
main.js          App initialization and salon open/closed status
app.js           Legacy standalone implementation; not loaded by index.html
assets/
  pawspa.png     Navbar logo


