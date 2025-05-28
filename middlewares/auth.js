function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (token !== process.env.AUTH_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { authenticate };
