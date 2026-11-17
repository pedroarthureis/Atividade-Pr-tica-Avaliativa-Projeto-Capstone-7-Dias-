class StatementController {
  constructor(statementService) {
    this.statementService = statementService;
  }

  async getStatement(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate, type } = req.query;

      const statement = await this.statementService.getStatement(id, {
        startDate,
        endDate,
        type: type ? type.toUpperCase() : undefined,
      });

      return res.status(200).json({
        message: 'Extrato bancário recuperado com sucesso.',
        data: statement,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = StatementController;
