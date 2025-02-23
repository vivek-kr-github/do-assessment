const express = require('express');
const tls = require('tls');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 5000;

// MongoDB Connection (Managed MongoDB on DigitalOcean)
const MONGO_URI = "mongodb+srv://doadmin:4N2db95jIKFy6318@private-ssl-mongodb-ec84c3c5.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=ssl-mongodb";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to Managed MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Define Schema for SSL Certificates
const certificateSchema = new mongoose.Schema({
    domain: String,
    issuer: String,
    valid_from: String,
    valid_to: String,
    serial_number: String,
    subject: String,
    fetched_at: { type: Date, default: Date.now } // Timestamp of fetch
});

// Create MongoDB Model
const Certificate = mongoose.model('Certificate', certificateSchema);

// Fetch SSL Certificate Details API with SNI
app.post('/get-certificate', async (req, res) => {
    const websiteUrl = req.body.url.replace(/^https?:\/\//, '').split('/')[0];

    const options = {
        host: websiteUrl,
        port: 443,
        servername: websiteUrl, // Required for SNI
        rejectUnauthorized: false
    };

    const reqTls = tls.connect(options, async () => {
        const cert = reqTls.getPeerCertificate();
        if (cert && Object.keys(cert).length > 0) {
            const certData = {
                domain: websiteUrl,
                issuer: cert.issuer.O,
                valid_from: cert.valid_from,
                valid_to: cert.valid_to,
                serial_number: cert.serialNumber,
                subject: cert.subject.O
            };

            // Save to MongoDB
            try {
                await Certificate.create(certData);
                console.log(`✅ Certificate stored in MongoDB for ${websiteUrl}`);
            } catch (err) {
                console.error("❌ MongoDB Insert Error:", err);
            }

            res.json(certData);
        } else {
            res.status(500).json({ error: "Could not fetch certificate" });
        }
        reqTls.end();
    });

    reqTls.on('error', (error) => {
        res.status(500).json({ error: "Invalid URL or No SSL certificate found", details: error.message });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

