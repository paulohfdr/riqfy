const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  if (error) {
    const msg = error.details.map(d => d.message.replace(/"/g, "'")).join('; ');
    return res.status(400).json({ erro: msg });
  }
  req.body = value;
  next();
};

const schemas = {
  login: Joi.object({
    username: Joi.string().max(100).required().messages({ 'any.required': 'Usuário é obrigatório' }),
    senha: Joi.string().max(200).required().messages({ 'any.required': 'Senha é obrigatória' })
  }),

  register: Joi.object({
    nome: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().max(200).required(),
    username: Joi.string().alphanum().min(3).max(100).required(),
    senha: Joi.string().min(8).max(200).required()
      .messages({ 'string.min': 'Senha deve ter no mínimo 8 caracteres' })
  }),

  receita: Joi.object({
    descricao: Joi.string().max(500).required(),
    valor: Joi.number().positive().required(),
    data: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({ 'string.pattern.base': 'Data inválida (use AAAA-MM-DD)' }),
    categoria_id: Joi.number().integer().positive().allow(null, '').default(null),
    recorrente: Joi.boolean().default(false)
  }),

  receber: Joi.object({
    data_recebimento: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({ 'string.pattern.base': 'Data de recebimento inválida (use AAAA-MM-DD)' })
  }),

  despesa: Joi.object({
    descricao: Joi.string().max(500).required(),
    valor: Joi.number().positive().required(),
    vencimento: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({ 'string.pattern.base': 'Data inválida (use AAAA-MM-DD)' }),
    categoria_id: Joi.number().integer().positive().allow(null, '').default(null),
    forma_pagamento: Joi.string().max(50).default('pix'),
    recorrente: Joi.boolean().default(false),
    total_parcelas: Joi.number().integer().min(1).max(60).default(1)
  }),

  categoria: Joi.object({
    nome: Joi.string().max(200).required(),
    tipo: Joi.string().valid('receita', 'despesa', 'geral').required(),
    cor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#2563EB')
      .messages({ 'string.pattern.base': 'Cor inválida (use formato #RRGGBB)' })
  }),

  meta: Joi.object({
    titulo: Joi.string().max(200).required(),
    valor_alvo: Joi.number().positive().required(),
    data_limite: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({ 'string.pattern.base': 'Data inválida (use AAAA-MM-DD)' }),
    status: Joi.string().valid('em_andamento', 'concluida', 'cancelada').default('em_andamento')
  }),

  aporte: Joi.object({
    valor: Joi.number().positive().required(),
    observacao: Joi.string().max(500).allow('', null).default(null)
  }),

  usuario: Joi.object({
    nome: Joi.string().min(2).max(200).required(),
    username: Joi.string().alphanum().min(3).max(100).required(),
    email: Joi.string().email().max(200).required(),
    senha: Joi.string().min(8).max(200).required()
      .messages({ 'string.min': 'Senha deve ter no mínimo 8 caracteres' }),
    nivel: Joi.string().valid('administrador', 'suporte').default('suporte')
  }),

  usuarioUpdate: Joi.object({
    nome: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().max(200).required(),
    nivel: Joi.string().valid('administrador', 'suporte').required(),
    status: Joi.string().valid('ativo', 'inativo').required()
  }),

  resetarSenha: Joi.object({
    nova_senha: Joi.string().min(8).max(200).required()
      .messages({ 'string.min': 'Senha deve ter no mínimo 8 caracteres' })
  }),

  recebidoToggle: Joi.object({
    recebido: Joi.number().integer().valid(0, 1).required()
  }),

  deleteIds: Joi.object({
    ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  })
};

module.exports = { validate, schemas };
