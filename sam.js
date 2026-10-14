// ==========================================
// 1. SETUP & DEPENDENCIES
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Middleware to parse form data sent from the browser
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB (Creates a database called 'expense_db' automatically)
mongoose.connect('mongodb://127.0.0.1:27017/Cluster0')
  .then(() => console.log('Connected to Expense Database successfully!'))
  .catch(err => console.error('Database connection error:', err));

// ==========================================
// 2. DATABASE SCHEMA & MODEL
// ==========================================
const ExpenseSchema = new mongoose.Schema({
  title: { type: String, required: true },       // Name of the expense (e.g., "Lunch")
  amount: { type: Number, required: true },      // Numeric cost (e.g., 15.50)
  category: { type: String, required: true },    // Group (e.g., "Food", "Rent")
  date: { type: Date, default: Date.now }        // Automatically logs today's date
});

const Expense = mongoose.model('Expense', ExpenseSchema);

// ==========================================
// 3. ROUTES & APPLICATION LOGIC
// ==========================================

// ROUTE 1: Display all expenses and the calculated total (GET)
app.get('/', async (req, res) => {
  try {
    // Fetch all logged expenses from MongoDB, newest items first
    const expenses = await Expense.find({}).sort({ date: -1 });

    // Calculate Total Spending using standard array math
    let totalSpent = 0;
    expenses.forEach(item => {
      totalSpent += item.amount;
    });

    // Loop through the records to build rows of HTML text
    const expenseRowsHTML = expenses.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 15px; margin-bottom: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 5px solid #4a5568;">
        <div>
          <strong style="font-size: 16px; color: #2d3748;">${item.title}</strong>
          <span style="margin-left: 8px; font-size: 12px; background: #e2e8f0; color: #4a5568; padding: 2px 8px; border-radius: 12px;">${item.category}</span>
          <div style="font-size: 11px; color: #a0aec0; margin-top: 3px;">${new Date(item.date).toLocaleDateString()}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="font-size: 18px; font-weight: bold; color: #e53e3e;">₹${item.amount.toFixed(2)}</span>
          
          <!-- Delete button using the standard unique ID -->
          <form action="/delete-expense/${item._id}" method="POST" style="margin: 0;">
            <button type="submit" style="background: none; border: none; color: #cbd5e0; cursor: pointer; font-size: 16px;" onmouseover="this.style.color='#e53e3e'" onmouseout="this.style.color='#cbd5e0'">🗑</button>
          </form>
        </div>
      </div>
    `).join('');

    // HTML Output sent directly to user's screen
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Personal Expense Tracker</title></head>
      <body style="font-family: Arial, sans-serif; background: #f7fafc; padding: 30px 20px; margin: 0;">
        
        <div style="max-width: 550px; margin: 0 auto;">
          <h2 style="text-align: center; color: #2d3748; margin-bottom: 25px;">💰 Personal Expense Tracker</h2>
          
          <!-- Summary card showing total spent dynamically -->
          <div style="background: #3182ce; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);">
            <p style="margin: 0; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Total Amount Spent</p>
            <h1 style="margin: 5px 0 0 0; font-size: 36px;">₹${totalSpent.toFixed(2)}</h1>
          </div>

          <!-- Form to insert a new expense log -->
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-top: 0; color: #4a5568;">Log New Expense</h3>
            <form action="/add-expense" method="POST">
              <input type="text" name="title" placeholder="What did you buy? (e.g., Coffee)" style="width: 95%; padding: 10px; margin-bottom: 12px; border: 1px solid #cbd5e0; border-radius: 4px;" required /><br>
              <input type="number" name="amount" step="0.01" placeholder="Amount (in ₹)" style="width: 95%; padding: 10px; margin-bottom: 12px; border: 1px solid #cbd5e0; border-radius: 4px;" required /><br>
              
              <select name="category" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #cbd5e0; border-radius: 4px; background: white;" required>
                <option value="" disabled selected>Select Category</option>
                <option value="Food">Food & Drinks</option>
                <option value="Transport">Transportation</option>
                <option value="Bills">Bills & Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other Miscellaneous</option>
              </select><br>

              <button type="submit" style="width: 100%; background: #38a169; color: white; border: none; padding: 12px; font-size: 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Add Expense Log</button>
            </form>
          </div>

          <!-- History Feed -->
          <div>
            <h3 style="color: #4a5568; margin-bottom: 15px;">Expense History</h3>
            ${expenseRowsHTML.length > 0 ? expenseRowsHTML : '<p style="text-align: center; color: #a0aec0; margin-top: 20px;">No expenses recorded yet.</p>'}
          </div>
        </div>

      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading backend dashboard: ' + error.message);
  }
});

// ROUTE 2: Handle incoming form submissions to create an entry (POST)
app.post('/add-expense', async (req, res) => {
  try {
    const { title, amount, category } = req.body;
    
    // Explicit conversion ensures it stores safely as a number field type inside MongoDB
    const newExpense = new Expense({
      title: title,
      amount: parseFloat(amount),
      category: category
    });

    await newExpense.save();
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error creating expense record: ' + error.message);
  }
});

// ROUTE 3: Delete an item completely using its id parameter route (POST)
app.post('/delete-expense/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error removing data record: ' + error.message);
  }
});

// ==========================================
// 4. START WEB SERVER
// ==========================================
app.listen(3000, () => {
  console.log('Expense Tracker running smoothly at http://localhost:3000');
});