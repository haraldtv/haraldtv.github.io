let dinners = {
    "name": "Retter",
    "dishes": [{
        "id": 1,
        "dish": "tunfiskpasta",
        "price": [1, 2],
        "ingredients": [
            "tunfisk",
            "fullkornpasta",
            "creme fraiche"
        ]
    },
    {
        "id": 2,
        "dish": "kjøttdeig og ris m/ egg",
        "price": [1, 2],
        "ingredients": [
            "kjøttdeig",
            "egg",
            "ris"
        ]
    },
    {
        "id": 3,
        "dish": "Kyllinglår m/ ris og brokkoli",
        "price": [1, 2],
        "ingredients": [
            "kyllinglår",
            "brokkoli",
            "ris"
        ],
    },
    {
        "id": 4,
        "dish": "Biffstrimler m/ ris",
        "price": [1, 2],
        "ingredients": [
            "biffstrimler",
            "ris",
            "løk"
        ],
    }
    ],
    "prices_total": [{
        "brokkoli": 42,
        "biffstrimler": 999,
        "creme fraiche": 25,
        "egg": 42,
        "kyllinglår": 106,
        "kjøttdeig": 67,
        "løk": 999,
        "pasta": 28,
        "ris": 38,
        "tunfisk": 24,
    }],
    "ingredients_size": [{
        "brokkoli": 3,
        "biffstrimler": 1,
        "creme fraiche": 3,
        "egg": 2,
        "kyllinglår": 3,
        "kjøttdeig": 1,
        "løk": 2,
        "pasta": 3,
        "ris": 5,
        "tunfisk": 1,
    }]

}

const dinnerN = 4;

document.getElementById("visibility").style.display = "none";
document.getElementById("handleliste").style.display = "none";

console.log("DinnerTime!");
console.log(dinners.dishes[2].ingredients[0]);

//Randomly generates a number that is used to assign a dinner to each day
function generateDinners() {
    let a = Math.random()
    let dinnerlist = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 7; i++) {
        if (dinnerlist[i] == 0) {
            dinnerlist[i] = Math.round(100 * Math.random() % (dinnerN-1)) + 1;
        }
    }
    console.log(dinnerlist)

    document.getElementById("visibility").style.display = "block";
    document.getElementById("handleliste").style.display = "block";

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

    document.getElementById("b1").innerHTML = fillIngredients(0, dinnerlist);
    document.getElementById("b2").innerHTML = fillIngredients(1, dinnerlist);
    document.getElementById("b3").innerHTML = fillIngredients(2, dinnerlist);
    document.getElementById("b4").innerHTML = fillIngredients(3, dinnerlist);
    document.getElementById("b5").innerHTML = fillIngredients(4, dinnerlist);
    document.getElementById("b6").innerHTML = fillIngredients(5, dinnerlist);
    document.getElementById("b7").innerHTML = fillIngredients(6, dinnerlist);

    //fillIngredients(0, dinnerlist);

    printShoppingList(shoppingList(dinnerlist));


}

function fillIngredients(tablepos, dinnerlist) {
    let ingredients = "";
    for (let i = 0; i < (dinners.dishes[dinnerlist[tablepos] - 1].ingredients).length; i++) {
        ingredients += (" " + (dinners.dishes[dinnerlist[tablepos] - 1].ingredients[i]) + "<br>");
    }
    console.log(ingredients);
    return ingredients;
}

function shoppingList(dinnerlist) {
    let ingredientlist = [];
    for (let i = 0; i < dinnerlist.length; i++) {
            if (!ingredientlist.includes(dinnerlist[i])) {
                ingredientlist.push(dinnerlist[i]);
            }
    }
    console.log(ingredientlist);
}

function shoppingListDumb(dinnerlist) {
    let ingredientlist = [];
    for (let i = 0; i < dinnerlist.length; i++) {
        if (!ingredientlist.includes(dinnerlist[i])) {
            ingredientlist.push(dinnerlist[i]);
        }
    }
    return ingredientlist;
}

function printShoppingList(ingredientlist) {
    console.log("Running printShoppingList");
    //var table = getElementById("handleTable");
    var row = table.insertRow(1);
    for(let i = 0; i < ingredientlist.length; i++) {
        var cell = row.insertCell(i);
        cell.innerHTML=ingredientlist[i];
    }
}

function genNum(dinnerlist) {
    let a = Math.round(100 * Math.random() % 2) + 1;
}