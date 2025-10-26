import bcrypt from 'bcryptjs';

async function hashCashierPassword() {
  const plainPassword = 'cashier'; // the current plain-text password
  const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 salt rounds
  console.log('Hashed password:', hashedPassword);
}

hashCashierPassword();
