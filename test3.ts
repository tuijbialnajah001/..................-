import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus&limit=1");
        console.log("breast_focus r34:", res.data.length);
    } catch(e){}
    try {
        const res2 = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=focus_on_breasts&limit=1");
        console.log("focus_on_breasts r34:", res2.data.length);
    } catch(e){}
})();
