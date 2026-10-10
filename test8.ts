import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus&limit=1");
        console.log("breast_focus safebooru:", res.data ? res.data.length : res.data);
    } catch(e){}
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=focus_on_breasts&limit=1");
        console.log("focus_on_breasts safebooru:", res.data ? res.data.length : res.data);
    } catch(e){}
})();
