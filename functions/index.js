const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('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');

admin.initializeApp();

// Only deploy the Stripe function for now
exports.createStripeCheckout = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { packageId, packageName, tokenAmount, price, userId } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `${packageName} - ${tokenAmount} Tokens` 
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://majestosomiau.github.io/IgnitionShift2/public/index.html?payment=success',
      cancel_url: 'https://majestosomiau.github.io/IgnitionShift2/public/index.html?payment=cancel',
      metadata: { userId, packageId },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});