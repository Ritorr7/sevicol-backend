// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const compression = require('compression');


const app = express();
app.use(cors({
  origin: [
    'https://Ritorr7.github.io',
    'https://Ritorr7.github.io/sevicol'
  ]
}));
// app.use(cors());
app.use(express.json());
app.use(compression());

const staticOpts = {
  etag: true,
  lastModified: true,
  setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
};
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOpts));
// === Estáticos ===
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/servicios', express.static(path.join(__dirname, 'uploads/servicios')));
app.use('/uploads/news', express.static(path.join(__dirname, 'uploads/news')));
app.use('/uploads/home', express.static(path.join(__dirname, 'uploads/home')));
app.use('/uploads/companies', express.static(path.join(__dirname, 'uploads/companies')));
// Estático para las fotos de postulaciones (dentro de /uploads/postulaciones)
app.use('/uploads/postulaciones', express.static(path.join(__dirname, 'uploads/postulaciones')));


// === API ===
app.use('/api/ubicaciones', require('./routes/ubicacionesRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));      // <-- corregido
app.use('/api/users', require('./routes/userRoutes'));    // <-- corregido
app.use('/api/servicios', require('./routes/serviciosRoutes'));
app.use('/api/cv', require('./routes/cvRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/home', require('./routes/homeRoutes'));
app.use('/api/clients', require('./routes/clientsRoutes'));

app.use('/api/contacto', require('./routes/contactRoutes'));
// === Namespace opcional exclusivo para dev ===
// app.use('/api/dev/clients', require('./routes/clientsRoutes')); // <-- creá este archivo solo para vos

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});





