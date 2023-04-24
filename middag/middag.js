generateDinner();

console.log("Test");
fetch("dinners.json").then(response => {
    console.log(response);
})

async function generateDinner() {
    fetch("dinners.json")

    const response = await fetch(haraldtv.github.io/middag/dinners.json);
    const dinners = await response.json;

    var dinnerDisplay = doccument.getElementById("dinnerList");
    console.log(dinners)
}