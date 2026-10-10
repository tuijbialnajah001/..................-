import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://hypnohub.net/post/index.json?limit=1");
        console.log("Hypnohub:", Array.isArray(res.data) ? "OK" : "Fail");
    } catch(e) {}
    try {
        const res = await axios.get("http://behoimi.org/post/index.json?limit=1");
        console.log("Behoimi:", Array.isArray(res.data) ? "OK" : "Fail");
    } catch(e) {}
})();
