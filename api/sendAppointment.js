export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, surname, email, phone, date, time, services, totalDuration, totalPrice, ownerEmail } = req.body;

    // Use URLSearchParams for form-encoded data (Formspree expects this)
    const params = new URLSearchParams();
    params.append('Ime', firstName);
    params.append('Priimek', surname);
    params.append('E-Mail stranke', email);
    params.append('Tel. št. stranke', phone);
    params.append('Datum termina', date);
    params.append('Čas termina', time);
    params.append('Storitve', services.join(', '));
    params.append('Končna cena', totalPrice + "€");
    params.append('Čas trajanja', totalDuration + " min");
    params.append('_subject', 'Novo Naročilo iz Spletne Strani');
    params.append('_replyto', email);
    params.append('_cc', ownerEmail);

    const response = await fetch('https://formspree.io/f/meegkorn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } else {
      const text = await response.text();
      return res.status(response.status).json({ success: false, error: text });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
