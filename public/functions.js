// functions.js - Backend Cloud Functions
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('pk_test_51SToWHEFW4StB6Z6Wu6PNEls9OzZr0zof8bDUW4GiPbSmb3NYBRInqevkphIZ46fr7eEHRtJztnBKJcInk5e8mTq00sVlr8nSV');

admin.initializeApp();

// Stripe Cloud Function
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
        const { packageId, packageName, tokenAmount, price, userId, userEmail } = data;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${tokenAmount} Ignition Tokens - ${packageName}`,
                        description: 'Premium game currency'
                    },
                    unit_amount: Math.round(price * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/payment-cancel`,
            customer_email: userEmail,
            metadata: {
                userId: userId,
                packageId: packageId,
                tokenAmount: tokenAmount
            }
        });

        return { id: session.id };
    } catch (error) {
        console.error('Stripe Session Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Process PayPal payment - Updated for Cloud Functions
async function processPayPalPayment(details, packageId, userId) {
    try {
        showLoadingModal('Processing PayPal payment...');
        
        // Use Cloud Function instead of direct fetch
        const processPayment = firebase.functions().httpsCallable('processPayPalPayment');
        
        const { data } = await processPayment({
            packageId: packageId,
            transactionId: details.id,
            payerEmail: details.payer.email_address,
            amount: details.purchase_units[0].amount.value,
            userId: userId
        });
        
        closeLoadingModal();
        
        if (data.success) {
            alert(`🎉 Payment successful! ${data.tokensAdded} tokens added to your account.`);
            closeModal('token-store-modal');
            // Refresh player data
            if (typeof loadPlayerData === 'function') {
                loadPlayerData(userId);
            }
        }
    } catch (error) {
        console.error('PayPal Processing Error:', error);
        closeLoadingModal();
        alert('Error processing PayPal payment: ' + error.message);
    }
}