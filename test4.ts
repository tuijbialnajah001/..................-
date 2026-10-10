import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus&limit=1");
        console.log("breast_focus r34:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
    } catch(e){}
    try {
        const res2 = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=focus_on_breasts&limit=1");
        console.log("focus_on_breasts r34:", typeof res2.data, Array.isArray(res2.data) ? res2.data.length : res2.data);
    } catch(e){}
    try {
        const res3 = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=huge_breasts&limit=1");
        console.log("huge_breasts r34:", typeof res3.data, Array.isArray(res3.data) ? res3.data.length : res3.data);
    } catch(e){}
})();
