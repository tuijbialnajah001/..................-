import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://realbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=1");
        console.log("Realbooru:", Array.isArray(res.data) || Array.isArray(res.data?.post) ? "OK" : "Fail");
    } catch(e) {}
})();
