import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus&limit=1");
        console.log("Gelbooru breast_focus", res.data?.post?.[0]?.id);
    } catch(e){}
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breasts score:>50&limit=1");
        console.log("Gelbooru breasts score:>50", res.data?.post?.[0]?.score);
    } catch(e){}
})();
