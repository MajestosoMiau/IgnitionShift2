const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('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');
const endpointSecret = 'whsec_Zft9eUWgPiZtIMvyYHmV6RCX5ua4hi8V';
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
      metadata: { 
  userId: userId, 
  packageId: packageId, 
  tokens: tokenAmount.toString()
},
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  console.log('🔄 Stripe webhook received');
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    console.log('✅ Event verified:', event.type);
  } catch (err) {
    console.log('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('💰 Payment successful for session:', session.id);
    console.log('📧 Customer email:', session.customer_email);
    console.log('📝 Metadata:', session.metadata);

    try {
      // Get user ID from metadata (you should pass this during checkout)
      const userId = session.metadata.userId;
      const tokensToAdd = parseInt(session.metadata.tokens) || 100; // Default fallback
      
      console.log(`🎯 Updating user ${userId} with ${tokensToAdd} tokens`);

      if (!userId) {
        console.log('❌ No userId in metadata');
        return res.status(400).send('No userId in metadata');
      }

      // Update user tokens in Firebase
      const userRef = admin.firestore().collection('users').doc(userId);
      await userRef.update({
        tokens: admin.firestore.FieldValue.increment(tokensToAdd),
        lastPurchase: new Date()
      });

      console.log('✅ Tokens updated successfully');
      res.json({received: true});
      
    } catch (error) {
      console.log('❌ Error updating tokens:', error);
      res.status(500).send('Error updating user tokens');
    }
  } else {
    console.log('ℹ️ Unhandled event type:', event.type);
    res.json({received: true});
  }
});