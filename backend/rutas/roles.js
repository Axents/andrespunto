function verificarAdmin(req, res, next) {
    const { userRole } = req.body;

    if (userRole !== 'admin') {
        return res.status(403).json({
            message: ' Solo los administradores pueden hacer esto'
        });
    }

    next();
}

module.exports=verificarAdmin;
