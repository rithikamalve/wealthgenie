import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Supabase client for auth
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify user token
async function verifyUser(authHeader: string | undefined) {
  if (!authHeader) {
    return { error: 'No authorization header', user: null };
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return { error: 'No token provided', user: null };
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Invalid token or user not found', user: null };
  }
  
  return { error: null, user };
}

// Health check endpoint
app.get("/make-server-2ee15a73/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-2ee15a73/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured
      email_confirm: true,
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: `Failed to create user: ${error.message}` }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'Failed to create user' }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    return c.json({ 
      message: 'User created successfully',
      userId: data.user.id,
    });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// Get user profile
app.get("/make-server-2ee15a73/user/profile", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.json({ error: `Failed to get profile: ${error.message}` }, 500);
  }
});

// ==================== TRANSACTION ROUTES ====================

// Add transaction
app.post("/make-server-2ee15a73/transactions", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { date, description, category, amount, type, source, fileId } = body;

    if (!date || !description || !category || !amount || !type) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get existing transactions
    const existingTransactions = await kv.get(`transactions:${user.id}`) || [];
    
    const newTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      description,
      category,
      amount: parseFloat(amount),
      type, // 'Income' or 'Expense'
      source: source || null,
      fileId: fileId || null,
      createdAt: new Date().toISOString(),
    };

    const updatedTransactions = [...existingTransactions, newTransaction];
    await kv.set(`transactions:${user.id}`, updatedTransactions);

    return c.json({ 
      message: 'Transaction added successfully',
      transaction: newTransaction,
    });
  } catch (error) {
    console.log('Add transaction error:', error);
    return c.json({ error: `Failed to add transaction: ${error.message}` }, 500);
  }
});

// Get all transactions with optional filters
app.get("/make-server-2ee15a73/transactions", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const year = c.req.query('year');
    const month = c.req.query('month');
    const type = c.req.query('type');
    const fileId = c.req.query('fileId');

    let transactions = await kv.get(`transactions:${user.id}`) || [];

    // Apply filters
    if (fileId) {
      transactions = transactions.filter((t: any) => t.fileId === fileId);
    }

    if (year) {
      transactions = transactions.filter((t: any) => {
        const txnYear = new Date(t.date).getFullYear().toString();
        return txnYear === year;
      });
    }

    if (month) {
      transactions = transactions.filter((t: any) => {
        const txnMonth = new Date(t.date).getMonth();
        return txnMonth === parseInt(month);
      });
    }

    if (type) {
      transactions = transactions.filter((t: any) => t.type === type);
    }

    return c.json({ transactions });
  } catch (error) {
    console.log('Get transactions error:', error);
    return c.json({ error: `Failed to get transactions: ${error.message}` }, 500);
  }
});

// Delete transaction
app.delete("/make-server-2ee15a73/transactions/:id", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const transactionId = c.req.param('id');
    const transactions = await kv.get(`transactions:${user.id}`) || [];
    
    const updatedTransactions = transactions.filter((t: any) => t.id !== transactionId);
    
    if (transactions.length === updatedTransactions.length) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    await kv.set(`transactions:${user.id}`, updatedTransactions);

    return c.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.log('Delete transaction error:', error);
    return c.json({ error: `Failed to delete transaction: ${error.message}` }, 500);
  }
});

// ==================== EMI ROUTES ====================

// Add EMI
app.post("/make-server-2ee15a73/emis", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, amount, dueDate, totalAmount, paid, fileId } = body;

    if (!name || !amount || !dueDate) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const existingEmis = await kv.get(`emis:${user.id}`) || [];
    
    const newEmi = {
      id: `emi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      amount: parseFloat(amount),
      dueDate,
      totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
      paid: paid ? parseFloat(paid) : 0,
      status: 'upcoming',
      fileId: fileId || null,
      createdAt: new Date().toISOString(),
    };

    const updatedEmis = [...existingEmis, newEmi];
    await kv.set(`emis:${user.id}`, updatedEmis);

    return c.json({ 
      message: 'EMI added successfully',
      emi: newEmi,
    });
  } catch (error) {
    console.log('Add EMI error:', error);
    return c.json({ error: `Failed to add EMI: ${error.message}` }, 500);
  }
});

// Get all EMIs with optional fileId filter
app.get("/make-server-2ee15a73/emis", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const fileId = c.req.query('fileId');
    let emis = await kv.get(`emis:${user.id}`) || [];

    // Filter by fileId if provided
    if (fileId) {
      emis = emis.filter((e: any) => e.fileId === fileId);
    }

    return c.json({ emis });
  } catch (error) {
    console.log('Get EMIs error:', error);
    return c.json({ error: `Failed to get EMIs: ${error.message}` }, 500);
  }
});

// Update EMI (mark as paid or update details)
app.put("/make-server-2ee15a73/emis/:id", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const emiId = c.req.param('id');
    const body = await c.req.json();
    
    const emis = await kv.get(`emis:${user.id}`) || [];
    const emiIndex = emis.findIndex((e: any) => e.id === emiId);
    
    if (emiIndex === -1) {
      return c.json({ error: 'EMI not found' }, 404);
    }

    // Update EMI with provided fields
    emis[emiIndex] = {
      ...emis[emiIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`emis:${user.id}`, emis);

    return c.json({ 
      message: 'EMI updated successfully',
      emi: emis[emiIndex],
    });
  } catch (error) {
    console.log('Update EMI error:', error);
    return c.json({ error: `Failed to update EMI: ${error.message}` }, 500);
  }
});

// Delete EMI
app.delete("/make-server-2ee15a73/emis/:id", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const emiId = c.req.param('id');
    const emis = await kv.get(`emis:${user.id}`) || [];
    
    const updatedEmis = emis.filter((e: any) => e.id !== emiId);
    
    if (emis.length === updatedEmis.length) {
      return c.json({ error: 'EMI not found' }, 404);
    }

    await kv.set(`emis:${user.id}`, updatedEmis);

    return c.json({ message: 'EMI deleted successfully' });
  } catch (error) {
    console.log('Delete EMI error:', error);
    return c.json({ error: `Failed to delete EMI: ${error.message}` }, 500);
  }
});

// ==================== SAVINGS ROUTES ====================

// Add or update savings goal
app.post("/make-server-2ee15a73/savings", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, targetAmount, currentAmount, deadline, status, fileId } = body;

    if (!name || !targetAmount || !deadline) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const existingSavings = await kv.get(`savings:${user.id}`) || [];
    
    const newGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      deadline,
      status: status || 'on-track',
      fileId: fileId || null,
      createdAt: new Date().toISOString(),
    };

    const updatedSavings = [...existingSavings, newGoal];
    await kv.set(`savings:${user.id}`, updatedSavings);

    return c.json({ 
      message: 'Savings goal added successfully',
      goal: newGoal,
    });
  } catch (error) {
    console.log('Add savings goal error:', error);
    return c.json({ error: `Failed to add savings goal: ${error.message}` }, 500);
  }
});

// Get all savings goals with optional fileId filter
app.get("/make-server-2ee15a73/savings", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const fileId = c.req.query('fileId');
    let savings = await kv.get(`savings:${user.id}`) || [];

    // Filter by fileId if provided
    if (fileId) {
      savings = savings.filter((g: any) => g.fileId === fileId);
    }

    return c.json({ savings });
  } catch (error) {
    console.log('Get savings goals error:', error);
    return c.json({ error: `Failed to get savings goals: ${error.message}` }, 500);
  }
});

// Update savings goal
app.put("/make-server-2ee15a73/savings/:id", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const goalId = c.req.param('id');
    const body = await c.req.json();
    
    const savings = await kv.get(`savings:${user.id}`) || [];
    const goalIndex = savings.findIndex((g: any) => g.id === goalId);
    
    if (goalIndex === -1) {
      return c.json({ error: 'Savings goal not found' }, 404);
    }

    savings[goalIndex] = {
      ...savings[goalIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`savings:${user.id}`, savings);

    return c.json({ 
      message: 'Savings goal updated successfully',
      goal: savings[goalIndex],
    });
  } catch (error) {
    console.log('Update savings goal error:', error);
    return c.json({ error: `Failed to update savings goal: ${error.message}` }, 500);
  }
});

// Delete savings goal
app.delete("/make-server-2ee15a73/savings/:id", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const goalId = c.req.param('id');
    const savings = await kv.get(`savings:${user.id}`) || [];
    
    const updatedSavings = savings.filter((g: any) => g.id !== goalId);
    
    if (savings.length === updatedSavings.length) {
      return c.json({ error: 'Savings goal not found' }, 404);
    }

    await kv.set(`savings:${user.id}`, updatedSavings);

    return c.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    console.log('Delete savings goal error:', error);
    return c.json({ error: `Failed to delete savings goal: ${error.message}` }, 500);
  }
});

// ==================== FILE HISTORY ROUTES ====================

// Upload file metadata
app.post("/make-server-2ee15a73/files", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { fileName, transactionCount } = body;

    if (!fileName || !transactionCount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const existingFiles = await kv.get(`files:${user.id}`) || [];
    
    const newFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      transactionCount,
      uploadedAt: new Date().toISOString(),
    };

    const updatedFiles = [...existingFiles, newFile];
    await kv.set(`files:${user.id}`, updatedFiles);

    // Set as active file
    await kv.set(`activeFile:${user.id}`, newFile.id);

    return c.json({ 
      message: 'File metadata saved successfully',
      file: newFile,
    });
  } catch (error) {
    console.log('Save file metadata error:', error);
    return c.json({ error: `Failed to save file metadata: ${error.message}` }, 500);
  }
});

// Get file history
app.get("/make-server-2ee15a73/files", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const files = await kv.get(`files:${user.id}`) || [];
    const activeFileId = await kv.get(`activeFile:${user.id}`) || null;

    return c.json({ files, activeFileId });
  } catch (error) {
    console.log('Get file history error:', error);
    return c.json({ error: `Failed to get file history: ${error.message}` }, 500);
  }
});

// Set active file
app.post("/make-server-2ee15a73/files/active", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { fileId } = body;

    if (!fileId) {
      return c.json({ error: 'File ID is required' }, 400);
    }

    await kv.set(`activeFile:${user.id}`, fileId);

    return c.json({ message: 'Active file set successfully', fileId });
  } catch (error) {
    console.log('Set active file error:', error);
    return c.json({ error: `Failed to set active file: ${error.message}` }, 500);
  }
});

// ==================== EXPORT ROUTE ====================

// Export all user data
app.get("/make-server-2ee15a73/export", async (c) => {
  try {
    const { error, user } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    const transactions = await kv.get(`transactions:${user.id}`) || [];
    const emis = await kv.get(`emis:${user.id}`) || [];
    const savings = await kv.get(`savings:${user.id}`) || [];

    const exportData = {
      profile,
      transactions,
      emis,
      savings,
      exportedAt: new Date().toISOString(),
    };

    return c.json(exportData);
  } catch (error) {
    console.log('Export data error:', error);
    return c.json({ error: `Failed to export data: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);
