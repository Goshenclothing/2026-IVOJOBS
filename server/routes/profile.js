const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/me', auth, async (req, res) => {
    try {
        if (req.app.get('isUsingMockDB')) {
            const user = req.app.locals.mockUsers.find(u => u._id === req.userData.userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            const { password, ...rest } = user;
            return res.json(rest);
        }
        const user = await User.findById(req.userData.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

router.patch('/', auth, upload.single('avatar'), async (req, res) => {
    try {
        const updates = { ...req.body };
        if (req.file) updates.avatar = `/uploads/${req.file.filename}`;
        if (typeof updates.skills === 'string') updates.skills = updates.skills.split(',').map(s => s.trim());
        if (req.app.get('isUsingMockDB')) {
            const userIndex = req.app.locals.mockUsers.findIndex(u => u._id === req.userData.userId);
            if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
            req.app.locals.mockUsers[userIndex] = { ...req.app.locals.mockUsers[userIndex], ...updates };
            const { password, ...rest } = req.app.locals.mockUsers[userIndex];
            return res.json(rest);
        }
        const user = await User.findByIdAndUpdate(req.userData.userId, { $set: updates }, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

router.get('/professionals', async (req, res) => {
    try {
        const { search } = req.query;
        if (req.app.get('isUsingMockDB')) {
             let pros = req.app.locals.mockUsers || [];
             if (search) {
                 const low = search.toLowerCase();
                 pros = pros.filter(p => (p.name && p.name.toLowerCase().includes(low)) || (p.headline && p.headline.toLowerCase().includes(low)) || (p.skills && p.skills.some(s => s.toLowerCase().includes(low))));
             }
             return res.json(pros.map(({ password, ...rest }) => rest));
        }
        let query = {};
        if (search) query = { $or: [{ name: new RegExp(search, 'i') }, { headline: new RegExp(search, 'i') }, { skills: new RegExp(search, 'i') }] };
        const professionals = await User.find(query).select('name headline company avatar skills about');
        res.json(professionals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching professionals' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (req.app.get('isUsingMockDB')) {
            const user = req.app.locals.mockUsers.find(u => u._id === req.params.id);
            if (!user) return res.status(404).json({ message: 'Professional not found' });
            const { password, ...rest } = user;
            return res.json(rest);
        }
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Professional not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

module.exports = router;