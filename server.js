const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());

app.get('/live-radar', async (req, res) => {
    const { lat, lng } = req.query;
    const radius = 250; 

    if (!lat || !lng) {
        return res.status(400).json({ error: "Ustad ji, Latitude aur Longitude toh bhejo!" });
    }

    const apiUrls = [
        `https://api.airplanes.live/v2/point/${lat}/${lng}/${radius}`,
        `https://api.adsb.fi/v2/point/${lat}/${lng}/${radius}`,
        `https://api.adsb.one/v2/point/${lat}/${lng}/${radius}`
    ];

    try {
        const fetchPromises = apiUrls.map(url => axios.get(url));
        const fastestResponse = await Promise.any(fetchPromises);
        
        res.json({
            success: true,
            provider: new URL(fastestResponse.config.url).hostname,
            flights: fastestResponse.data.ac || []
        });
    } catch (error) {
        try {
            let latNum = parseFloat(lat);
            let lngNum = parseFloat(lng);
            let osUrl = `https://opensky-network.org/api/states/all?lamin=${latNum-3}&lomin=${lngNum-3}&lamax=${latNum+3}&lomax=${lngNum+3}`;
            
            const osResponse = await axios.get(osUrl);
            const flights = [];
            
            if (osResponse.data.states) {
                osResponse.data.states.forEach(f => {
                    flights.push({
                        hex: f[0], flight: f[1], r: f[2], lon: f[5], lat: f[6], 
                        alt_baro: f[7] ? Math.round(f[7] * 3.28084) : 0, 
                        gs: f[9] ? Math.round(f[9] * 1.94384) : 0, 
                        track: f[10], desc: (f[17] === 2 || f[17] === 3) ? "Private" : "Commercial"
                    });
                });
            }
            res.json({ success: true, provider: "opensky-network.org (Backup)", flights: flights });
        } catch (backupError) {
            res.status(500).json({ error: "Saare radars offline hain mere Tycoon!" });
        }
    }
});

// 🔥 THE VERCEL MAGIC LINE 🔥 (Is line ki wajah se Vercel par chalega)
module.exports = app;
