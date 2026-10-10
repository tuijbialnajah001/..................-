import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=huge_breasts&limit=1");
        console.log("huge_breasts safebooru:", res.data.length);
    } catch(e){}
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=cleavage&limit=1");
        console.log("cleavage safebooru:", res.data.length);
    } catch(e){}
})();
