class TransferController {
  constructor(transferService) {
    this.transferService = transferService;
  }

  async transfer(req, res, next) {
    try {
      const { sourceAccountId, destinationAccountId, amount } = req.body;
      const idempotencyKey =
        req.headers['x-idempotency-key'] ||
        req.headers['X-Idempotency-Key'] ||
        req.body.idempotencyKey ||
        null;

      const result = await this.transferService.executeTransfer({
        sourceAccountId,
        destinationAccountId,
        amount,
        idempotencyKey,
      });

      const statusCode = result.isIdempotentReplay ? 200 : 201;

      return res.status(statusCode).json({
        message: result.isIdempotentReplay
          ? 'Transferência recuperada via idempotência com sucesso.'
          : 'Transferência realizada com sucesso.',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = TransferController;
