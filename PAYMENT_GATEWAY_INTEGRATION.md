# Payment Gateway Integration Guide

## Current Implementation (Mock Payment)

**Status:** Testing mode - Mock payment with 1.5 second delay  
**File:** `/js/services/payment.js`

### Flow
1. User configures charging (selects mode, sees cost)
2. User clicks **"PAY ₹XX.XX"** button
3. Mock payment processes (1.5s delay)
4. **"START CHARGING"** button appears
5. User starts charging

---

## Future: Real Payment Gateway Integration

### Recommended Gateways for India

#### 1. Razorpay (Recommended)
- **Best for:** Indian market
- **Fees:** 2% per transaction
- **Features:** UPI, Cards, Wallets, Net Banking
- **Integration:** Easy, well-documented

#### 2. Paytm Payment Gateway
- **Best for:** High UPI volume
- **Fees:** 1.99% per transaction
- **Features:** Paytm Wallet, UPI, Cards

#### 3. PhonePe Payment Gateway
- **Best for:** UPI-first approach
- **Fees:** Competitive rates
- **Features:** UPI, Cards, Wallets

---

## Integration Steps (Razorpay Example)

### Step 1: Backend - Create Payment Order

**File:** `flashCharge-backend/src/routes/payments.js`

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/create-order', authenticateToken, async (req, res) => {
  const { amount, chargerId, connectorId, mode, predictions } = req.body;
  
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `CHG_${chargerId}_${Date.now()}`,
      notes: {
        chargerId,
        connectorId,
        mode,
        userId: req.user.id
      }
    });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify-payment', authenticateToken, async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  
  if (expectedSignature === signature) {
    // Payment verified - Store in database
    await db.query(`
      INSERT INTO payments (user_id, order_id, payment_id, amount, status)
      VALUES (?, ?, ?, ?, 'SUCCESS')
    `, [req.user.id, orderId, paymentId, req.body.amount]);
    
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false });
  }
});
```

### Step 2: Frontend - Update Payment Service

**File:** `flashCharge-ui/js/services/payment.js`

```javascript
export async function initiatePayment(amount, chargerId, connectorId, mode, predictions) {
  // Step 1: Create order on backend
  const orderResponse = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({
      amount,
      chargerId,
      connectorId,
      mode,
      predictions
    })
  });
  
  const orderData = await orderResponse.json();
  
  // Step 2: Open Razorpay checkout
  return new Promise((resolve, reject) => {
    const options = {
      key: 'YOUR_RAZORPAY_KEY_ID',
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'flashCharge',
      description: `Charging for ${chargerId}`,
      image: '/logo.png',
      handler: async function(response) {
        // Step 3: Verify payment on backend
        const verifyResponse = await fetch('/api/payments/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            amount: amount
          })
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.verified) {
          resolve({
            success: true,
            transactionId: response.razorpay_payment_id,
            amount: amount,
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error('Payment verification failed'));
        }
      },
      modal: {
        ondismiss: function() {
          reject(new Error('Payment cancelled'));
        }
      },
      prefill: {
        name: 'User Name',
        email: 'user@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#3b82f6'
      }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
  });
}
```

### Step 3: Add Razorpay Script to HTML

**File:** `configure-charge.html`

```html
<head>
  <!-- Add before closing head tag -->
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
```

### Step 4: Database Schema

```sql
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  payment_id_gateway VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
  charger_id VARCHAR(50),
  connector_id INT,
  mode VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

---

## Environment Variables

Add to `.env`:

```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# Paytm (alternative)
PAYTM_MERCHANT_ID=xxxxxxxxxxxxx
PAYTM_MERCHANT_KEY=xxxxxxxxxxxxx

# PhonePe (alternative)
PHONEPE_MERCHANT_ID=xxxxxxxxxxxxx
PHONEPE_SALT_KEY=xxxxxxxxxxxxx
```

---

## Testing

### Test Mode (Current)
- Mock payment with 1.5s delay
- No real money involved
- Instant success

### Razorpay Test Mode
- Use test API keys
- Test cards: 4111 1111 1111 1111
- Test UPI: success@razorpay
- No real money charged

### Production Mode
- Use live API keys
- Real payments processed
- Webhook for payment notifications

---

## Security Checklist

- [ ] Never expose API secrets in frontend
- [ ] Always verify payment signature on backend
- [ ] Store payment records in database
- [ ] Implement webhook for payment status updates
- [ ] Add payment timeout (15 minutes)
- [ ] Handle payment failures gracefully
- [ ] Implement refund mechanism
- [ ] Log all payment attempts
- [ ] Add fraud detection
- [ ] Comply with PCI DSS standards

---

## Webhook Setup (Razorpay)

**Endpoint:** `POST /api/payments/webhook`

```javascript
router.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature === expectedSignature) {
    const event = req.body.event;
    const payment = req.body.payload.payment.entity;
    
    if (event === 'payment.captured') {
      // Update payment status in database
      await db.query(`
        UPDATE payments 
        SET status = 'SUCCESS', payment_id_gateway = ?
        WHERE order_id = ?
      `, [payment.id, payment.order_id]);
    }
    
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
});
```

---

## Cost Calculation

### Current Model
- User pays ESTIMATED cost upfront
- Actual energy consumed may vary slightly
- Refund difference if actual < estimated
- Charge extra if actual > estimated (rare)

### Alternative: Wallet Model
- User loads money into wallet
- Charging deducts from wallet in real-time
- No upfront payment needed
- Better for frequent users

---

## Implementation Timeline

### Phase 1: Mock Payment (Current) ✅
- Testing mode
- No real payment
- Validates flow

### Phase 2: Razorpay Integration (2-3 days)
- Backend order creation
- Frontend checkout integration
- Payment verification
- Database storage

### Phase 3: Webhook & Refunds (1-2 days)
- Webhook handler
- Refund mechanism
- Payment reconciliation

### Phase 4: Production (1 day)
- Switch to live keys
- Final testing
- Go live

**Total:** ~1 week for full integration

---

## Support

**Razorpay Docs:** https://razorpay.com/docs/  
**Paytm Docs:** https://developer.paytm.com/  
**PhonePe Docs:** https://developer.phonepe.com/

---

**Status:** Mock payment implemented, ready for gateway integration  
**Next Step:** Choose payment gateway and implement Phase 2
