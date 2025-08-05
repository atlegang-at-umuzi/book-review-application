const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(cors());

let books = {
    1: {
        isbn: "978-0-7432-7356-5",
        author: "Chinua Achebe",
        title: "Things Fall Apart",
        reviews: {
            "user1": "Great book about African culture and colonialism",
            "user2": "A masterpiece of African literature"
        }
    },
    2: {
        isbn: "978-0-452-28423-4",
        author: "Hans Christian Andersen",
        title: "Fairy tales",
        reviews: {
            "user1": "Classic fairy tales that never get old"
        }
    },
    3: {
        isbn: "978-0-14-143951-8",
        author: "Dante Alighieri",
        title: "The Divine Comedy",
        reviews: {
            "user2": "Epic journey through hell, purgatory, and paradise"
        }
    },
    4: {
        isbn: "978-0-7432-7357-2",
        author: "Unknown",
        title: "The Epic Of Gilgamesh",
        reviews: {}
    },
    5: {
        isbn: "978-0-393-97781-1",
        author: "Unknown",
        title: "The Book Of Job",
        reviews: {
            "user1": "Profound exploration of suffering and faith"
        }
    },
    6: {
        isbn: "978-0-14-044919-1",
        author: "Unknown",
        title: "One Thousand and One Nights",
        reviews: {}
    },
    7: {
        isbn: "978-0-14-044914-6",
        author: "Unknown",
        title: "Nj\u00e1l's Saga",
        reviews: {}
    },
    8: {
        isbn: "978-0-14-044793-7",
        author: "Jane Austen",
        title: "Pride and Prejudice",
        reviews: {
            "user2": "Witty and romantic, a timeless classic"
        }
    },
    9: {
        isbn: "978-0-14-043516-3",
        author: "Honor\u00e9 de Balzac",
        title: "Le P\u00e8re Goriot",
        reviews: {}
    },
    10: {
        isbn: "978-0-553-21311-7",
        author: "Samuel Beckett",
        title: "Molloy, Malone Dies, The Unnamable, the trilogy",
        reviews: {}
    }
};

let users = {}; // Store registered users

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const findBooksByCriteria = (criteria, value) => {
    return Object.entries(books)
        .filter(([id, book]) => {
            if (criteria === 'author') {
                return book.author.toLowerCase().includes(value.toLowerCase());
            } else if (criteria === 'title') {
                return book.title.toLowerCase().includes(value.toLowerCase());
            } else if (criteria === 'isbn') {
                return book.isbn === value;
            }
            return false;
        })
        .reduce((acc, [id, book]) => {
            acc[id] = book;
            return acc;
        }, {});
};


app.get('/books', (req, res) => {
    try {
        res.json({
            success: true,
            books: books,
            count: Object.keys(books).length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving books',
            error: error.message 
        });
    }
});

app.get('/isbn/:isbn', (req, res) => {
    try {
        const isbn = req.params.isbn;
        const foundBooks = findBooksByCriteria('isbn', isbn);
        
        if (Object.keys(foundBooks).length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No books found with the given ISBN'
            });
        }
        
        res.json({
            success: true,
            books: foundBooks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching by ISBN',
            error: error.message
        });
    }
});

app.get('/author/:author', (req, res) => {
    try {
        const author = req.params.author;
        const foundBooks = findBooksByCriteria('author', author);
        
        if (Object.keys(foundBooks).length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No books found by the given author'
            });
        }
        
        res.json({
            success: true,
            books: foundBooks,
            author: author
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching by author',
            error: error.message
        });
    }
});

app.get('/title/:title', (req, res) => {
    try {
        const title = req.params.title;
        const foundBooks = findBooksByCriteria('title', title);
        
        if (Object.keys(foundBooks).length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No books found with the given title'
            });
        }
        
        res.json({
            success: true,
            books: foundBooks,
            title: title
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching by title',
            error: error.message
        });
    }
});

app.get('/review/:id', (req, res) => {
    try {
        const bookId = req.params.id;
        
        if (!books[bookId]) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }
        
        res.json({
            success: true,
            book: {
                id: bookId,
                title: books[bookId].title,
                author: books[bookId].author,
                isbn: books[bookId].isbn
            },
            reviews: books[bookId].reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving reviews',
            error: error.message
        });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        if (users[username]) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Store user
        users[username] = {
            username,
            password: hashedPassword,
            email: email || '',
            registeredAt: new Date().toISOString()
        };
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                username,
                email: email || '',
                registeredAt: users[username].registeredAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        const user = users[username];
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});


app.put('/auth/review/:id', authenticateToken, (req, res) => {
    try {
        const bookId = req.params.id;
        const { review } = req.body;
        const username = req.user.username;
        
        if (!books[bookId]) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }
        
        if (!review || review.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Review content is required'
            });
        }
        
        // Add or update review
        books[bookId].reviews[username] = review.trim();
        
        res.json({
            success: true,
            message: 'Review added/updated successfully',
            book: {
                id: bookId,
                title: books[bookId].title
            },
            review: {
                user: username,
                content: review.trim(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding/updating review',
            error: error.message
        });
    }
});

app.delete('/auth/review/:id', authenticateToken, (req, res) => {
    try {
        const bookId = req.params.id;
        const username = req.user.username;
        
        if (!books[bookId]) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }
        
        if (!books[bookId].reviews[username]) {
            return res.status(404).json({
                success: false,
                message: 'No review found by this user for this book'
            });
        }
        
        // Delete review
        delete books[bookId].reviews[username];
        
        res.json({
            success: true,
            message: 'Review deleted successfully',
            book: {
                id: bookId,
                title: books[bookId].title
            },
            deletedBy: username
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
});


const getAllBooksAsync = async (callback) => {
    try {

        await new Promise(resolve => setTimeout(resolve, 100));
        callback(null, books);
    } catch (error) {
        callback(error, null);
    }
};

app.get('/async/books', (req, res) => {
    getAllBooksAsync((error, books) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving books with async callback',
                error: error.message
            });
        }
        
        res.json({
            success: true,
            method: 'Async Callback',
            books: books,
            count: Object.keys(books).length
        });
    });
});


const searchByISBNPromise = (isbn) => {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                const foundBooks = findBooksByCriteria('isbn', isbn);
                if (Object.keys(foundBooks).length === 0) {
                    reject(new Error('No books found with the given ISBN'));
                } else {
                    resolve(foundBooks);
                }
            }, 100);
        } catch (error) {
            reject(error);
        }
    });
};

app.get('/promise/isbn/:isbn', (req, res) => {
    const isbn = req.params.isbn;
    
    searchByISBNPromise(isbn)
        .then(books => {
            res.json({
                success: true,
                method: 'Promise',
                books: books,
                isbn: isbn
            });
        })
        .catch(error => {
            res.status(404).json({
                success: false,
                message: 'Error searching by ISBN with Promise',
                error: error.message
            });
        });
});

// Task 12: Search by Author (2 Points)
const searchByAuthorPromise = (author) => {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                const foundBooks = findBooksByCriteria('author', author);
                if (Object.keys(foundBooks).length === 0) {
                    reject(new Error('No books found by the given author'));
                } else {
                    resolve(foundBooks);
                }
            }, 100);
        } catch (error) {
            reject(error);
        }
    });
};

app.get('/promise/author/:author', async (req, res) => {
    try {
        const author = req.params.author;
        const books = await searchByAuthorPromise(author);
        
        res.json({
            success: true,
            method: 'Promise with Async/Await',
            books: books,
            author: author
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Error searching by author with Promise',
            error: error.message
        });
    }
});

const searchByTitleAsync = async (title) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const foundBooks = findBooksByCriteria('title', title);
                if (Object.keys(foundBooks).length === 0) {
                    reject(new Error('No books found with the given title'));
                } else {
                    resolve(foundBooks);
                }
            } catch (error) {
                reject(error);
            }
        }, 100);
    });
};

app.get('/async/title/:title', async (req, res) => {
    try {
        const title = req.params.title;
        const books = await searchByTitleAsync(title);
        
        res.json({
            success: true,
            method: 'Async/Await',
            books: books,
            title: title
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Error searching by title with Async/Await',
            error: error.message
        });
    }
});

app.get('/external/books', async (req, res) => {
    try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts', {
            timeout: 5000
        });
        
        res.json({
            success: true,
            message: 'External API data fetched successfully',
            method: 'Axios with Async/Await',
            externalData: response.data.slice(0, 5), 
            localBooks: Object.keys(books).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching external data',
            error: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Book Review API is running',
        timestamp: new Date().toISOString(),
        totalBooks: Object.keys(books).length,
        totalUsers: Object.keys(users).length
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        availableRoutes: [
            'GET /books - Get all books',
            'GET /isbn/:isbn - Get books by ISBN',
            'GET /author/:author - Get books by author',
            'GET /title/:title - Get books by title',
            'GET /review/:id - Get book reviews',
            'POST /register - Register new user',
            'POST /login - Login user',
            'PUT /auth/review/:id - Add/modify review (authenticated)',
            'DELETE /auth/review/:id - Delete review (authenticated)',
            'GET /async/books - Get books with async callback',
            'GET /promise/isbn/:isbn - Search ISBN with Promise',
            'GET /promise/author/:author - Search author with Promise',
            'GET /async/title/:title - Search title with Async/Await'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Book Review Server running on port ${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   All Books: http://localhost:${PORT}/books`);
    console.log(`   Register: POST http://localhost:${PORT}/register`);
    console.log(`   Login: POST http://localhost:${PORT}/login`);
    console.log(`\n🔐 Authentication required for:`);
    console.log(`   - PUT /auth/review/:id`);
    console.log(`   - DELETE /auth/review/:id`);
});

module.exports = app;