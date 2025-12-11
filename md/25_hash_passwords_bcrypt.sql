-- Script to update owner and manager passwords with bcrypt hashes
-- Generated hashes using bcryptjs with saltRounds=10

-- Owner password: owner123
-- Hash: $2b$10$gj8fmsZhkqlvFN0KPvVNm.95lviOed082ocRWFBCFZPqfqdf6sr4u

-- Manager password: manager123  
-- Hash: $2b$10$y3xuWuzx9mcYe/Kw5Nu5gOXmxRjWpgrKPK7lvLCqP/2pWm2p/TXHm

UPDATE staff 
SET password_hash = '$2b$10$gj8fmsZhkqlvFN0KPvVNm.95lviOed082ocRWFBCFZPqfqdf6sr4u'
WHERE email = 'owner@foodies.com' AND role = 'owner';

UPDATE staff 
SET password_hash = '$2b$10$y3xuWuzx9mcYe/Kw5Nu5gOXmxRjWpgrKPK7lvLCqP/2pWm2p/TXHm'
WHERE email = 'manager@foodies.com' AND role = 'manager';

-- Verify
SELECT email, role, password_hash FROM staff WHERE role IN ('owner', 'manager');
