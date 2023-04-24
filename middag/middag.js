generateDinner();


function generateDinner() {
    fetch(dinners.json)

    const response = fetch(haraldtv.github.io/middag/dinners.json);
    const data = response.json;

    var dinnerDisplay = doccument.getElementById("dinnerList");
    console.log(data)
}