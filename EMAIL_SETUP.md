# 📧 EmailJS Setup Guide

Your barber shop website is ready to send appointment confirmations to email. Here's how to set it up:

## Step 1: Register on EmailJS
1. Go to https://www.emailjs.com/
2. Click **Sign Up** (free account)
3. Enter email, password, confirm
4. Verify your email address

## Step 2: Create Email Service
1. Go to **Email Services** in dashboard
2. Click **Add New Service**
3. Choose provider:
   - **Gmail** (recommended) - Easy setup
   - **Outlook** - Alternative
   - **Other SMTP** - Advanced option
4. Follow the connect steps

**For Gmail:**
- You'll need to create an "App Password" (not your regular password)
- Go to myaccount.google.com → Security → App passwords
- Choose "Mail" and "Windows Computer"
- Gmail will generate a 16-character password
- Use that in EmailJS setup
- Click **Create** and copy the **Service ID**

## Step 3: Create Email Template
1. Go to **Email Templates** in dashboard
2. Click **Create New Template**
3. Name it: `appointment_notification`
4. Set **Email to**: `{{to_email}}`
5. Set **Subject**: `Nova Naročila - {{customer_name}}`
6. Set **Content** (HTML template):

```html
<h2>Nova Rezervacija!</h2>

<p><strong>Ime:</strong> {{customer_name}}</p>
<p><strong>Email:</strong> {{customer_email}}</p>
<p><strong>Telefon:</strong> {{customer_phone}}</p>

<hr>

<p><strong>Datum:</strong> {{appointment_date}}</p>
<p><strong>Čas:</strong> {{appointment_time}}</p>
<p><strong>Storitve:</strong> {{services}}</p>

<hr>

<p><strong>Trajanje:</strong> {{total_duration}} minut</p>
<p><strong>Cena:</strong> €{{total_price}}</p>
```

7. Click **Create**
8. Copy the **Template ID** (shown as `appointment_notification` or similar)

## Step 4: Get Your Credentials
You need 3 things:

### Find Public Key:
1. Click your **email icon** (top right)
2. Go to **Account** → **API** → **Public Key**
3. Copy it

### Service ID:
- Found in Email Services section (from Step 2)
- Looks like: `service_a1b2c3d4e5f6g7h8`

### Template ID:
- From Email Templates section (Step 3)
- You named it `appointment_notification`

## Step 5: Update index.html
Replace the placeholders in [index.html](index.html):

**Line ~258:** Replace `PUBLIC_KEY_HERE`
```javascript
emailjs.init("YOUR_PUBLIC_KEY_HERE");
```

**Line ~620 & 621:** Replace SERVICE_ID and TEMPLATE_ID
```javascript
emailjs.send(
    "YOUR_SERVICE_ID_HERE",      // Service ID from Email Services
    "YOUR_TEMPLATE_ID_HERE",      // Template ID from Email Templates
    {
        // ... parameters ...
    }
);
```

## Step 6: Test It!
1. Open your website
2. Go to **Booking** section
3. Select a service, date, time
4. Fill in name, email, phone
5. Submit appointment
6. Check:
   - Your email inbox for the confirmation
   - Browser console for success message
   - Admin panel for saved appointment

## Troubleshooting

**"EmailJS not configured yet" message?**
- You haven't replaced the placeholder keys
- Check the keys are correct (copy-paste exactly)

**Email not arriving?**
- Check spam/junk folder
- Make sure Gmail "App Password" was used (not regular password)
- Verify Service is "Connected" (green checkmark in EmailJS dashboard)

**Want to send to customer too?**
- Create another template for customer confirmation
- Add another `emailjs.send()` call with customer email

**Need support?**
- EmailJS docs: https://www.emailjs.com/docs/
- Contact: https://www.emailjs.com/contact/

## Free Tier Limits
- **200 emails/month** (plenty for a barber shop!)
- No credit card required
- Upgrade anytime if needed

---

✅ Once configured, your appointment confirmations will arrive automatically!
