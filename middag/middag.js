let dinners = {
    "name": "Retter",
    "dishes": [{
        "id": 1,
        "dish": "tunfiskpasta",
        "price": [1, 2],
        "ingredients": [{
            "tunfisk": [3, 4],
            "fullkornpasta": [5, 6],
            "creme fraiche": [7, 8]        
        }]
    },
    {
        "id": 2,
        "dish": "kjøttdeig og ris m/ egg",
        "price": [1, 2],
        "ingredients": [{
            "kjøttdeig": [3, 4],
            "egg": [5, 6],
            "ris": [7, 9]
        }]
    },
    {
        "id": 3,
        "dish": "Kyllinglår m/ ris og brokkoli",
        "price": [1, 2],
        "ingredients": [{
            "kyllinglår": [3, 4],
            "brokkoli": [5, 6],
            "ris": [7, 9]
        }]
    }
]
}

document.getElementById("visibility").style.display = "none";
console.log("DinnerTime!");

function generateDinners() {
    let a = Math.random()
    let dinnerlist = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 7; i++) {
        if (dinnerlist[i] == 0) {
            dinnerlist[i] = Math.round(100 * Math.random() % 2) + 1;
        }
    }
    console.log(dinnerlist)

    document.getElementById("visibility").style.display = "block";

    fillTable(dinnerlist);
}

function fillTable(dinnerlist) {
    document.getElementById("a1").innerHTML=dinners.dishes[dinnerlist[0]-1].dish;
    document.getElementById("a2").innerHTML=dinners.dishes[dinnerlist[1]-1].dish;
    document.getElementById("a3").innerHTML=dinners.dishes[dinnerlist[2]-1].dish;
    document.getElementById("a4").innerHTML=dinners.dishes[dinnerlist[3]-1].dish;
    document.getElementById("a5").innerHTML=dinners.dishes[dinnerlist[4]-1].dish;
    document.getElementById("a6").innerHTML=dinners.dishes[dinnerlist[5]-1].dish;
    document.getElementById("a7").innerHTML=dinners.dishes[dinnerlist[6]-1].dish;
}

function genNum(dinnerlist) {
    let a = Math.round(100 * Math.random() % 2) + 1;
}