import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=huge_breasts&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("huge_breasts r34:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
    } catch(e){}
    try {
        const res = await axios.get("https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=huge_breasts&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("huge_breasts r34.xxx:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
    } catch(e){}
})();
