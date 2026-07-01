import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    // Verify token using JWT_ACCESS_SECRET
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Attach decoded user information (userId) to request object
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};
