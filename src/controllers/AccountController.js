class AccountController {
  constructor(accountService) {
    this.accountService = accountService;
  }

  async create(req, res, next) {
    try {
      const { accountNumber, holderName, documentNumber, initialBalance } = req.body;
      const account = await this.accountService.createAccount({
        accountNumber,
        holderName,
        documentNumber,
        initialBalance: initialBalance !== undefined ? initialBalance : 0.0,
      });

      return res.status(201).json({
        message: 'Conta digital criada com sucesso.',
        data: account.toJSON(),
      });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const account = await this.accountService.getAccountById(id);
      return res.status(200).json({
        data: account.toJSON(),
      });
    } catch (err) {
      return next(err);
    }
  }

  async getByNumber(req, res, next) {
    try {
      const { accountNumber } = req.params;
      const account = await this.accountService.getAccountByNumber(accountNumber);
      return res.status(200).json({
        data: account.toJSON(),
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AccountController;
