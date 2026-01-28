export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, surname, email, phone, date, time, services, totalDuration, totalPrice, ownerEmail } = req.body;

    const formData = new FormData();
    formData.append('Ime', firstName);
    formData.append('Priimek', surname);
    formData.append('E-Mail stranke', email);
    formData.append('Tel. št. stranke', phone);
    formData.append('Datum termina', date);
    formData.append('Čas termina', time);
    formData.append('Storitve', services.join(', '));
    formData.append('Končna cena', totalPrice + "€");
    formData.append('Čas trajanja', totalDuration + " min");
    formData.append('_subject', 'Novo Naročilo iz Spletne Strani');
    formData.append('_replyto', email);
    formData.append('_cc', ownerEmail);

    const response = await fetch('https://formspree.io/f/meegkorn', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } else {
      return res.status(response.status).json({ success: false, error: 'Formspree error' });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
