class WebhookController {
  // Endpoint receptor do webhook simulando gateway externo anti-fraude / conciliação
  async receiveFraudNotification(req, res) {
    const { event, transferId, riskScore, verdict } = req.body;

    return res.status(200).json({
      received: true,
      event: event || 'TRANSACTION_ANALYSIS',
      transferId: transferId || null,
      verdict: verdict || 'ACKNOWLEDGED',
      riskScore: riskScore || 0.0,
      processedAt: new Date().toISOString(),
    });
  }
}

module.exports = WebhookController;
