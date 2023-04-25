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
            "ris", 
            "vårløk"
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
    },
    {
        "id": 5,
        "dish": "Pokebowl",
        "price": [1, 2],
        "ingredients": [
            "laks",
            "ris",
            "syltet løk",
            "brokkoli",
            "sukkererter"
        ],
    },
    {
        "id": 6,
        "dish": "Stekt laks og ris",
        "price": [1, 2],
        "ingredients": [
            "laks",
            "ris",
            "brokkoli"
        ],
    },
    {
        "id": 7,
        "dish": "Kylling og frites",
        "price": [1, 2],
        "ingredients": [
            "kyllingfillet",
            "pommes frites",
            "løk"
        ],
    }
    ],
    "prices_total": {
        "brokkoli": 42,
        "biffstrimler": 75,
        "creme fraiche": 25,
        "egg": 42,
        "kyllingfillet": 65,
        "kyllinglår": 106,
        "kjøttdeig": 67,
        "laks": 105,
        "løk": 10,
        "fullkornpasta": 28,
        "pommes frites": 40,
        "ris": 38,
        "sukkererter": 45,
        "syltet løk": 10,
        "tunfisk": 24,
        "vårløk": 25
},
    "ingredients_size": {
        "brokkoli": 3,
        "biffstrimler": 1,
        "creme fraiche": 3,
        "egg": 2,
        "kyllingfillet": 2,
        "kyllinglår": 3,
        "kjøttdeig": 1,
        "laks": 2,
        "løk": 2,
        "fullkornpasta": 3,
        "pommes frites": 2,
        "ris": 5,
        "sukkererter": 2,
        "syltet løk": 1,
        "tunfisk": 1,
        "vårløk": 2
    }

}

const dinnerN = 7;

document.getElementById("visibility").style.display = "none";
document.getElementById("handleliste").style.display = "none";

console.log("DinnerTime!");
console.log(dinners.dishes[2].ingredients[0]);

var generated = false;

//Randomly generates a number that is used to assign a dinner to each day
function generateDinners() {
    if (generated == true) {
        return;
    }
    let a = Math.random()
    let dinnerlist = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 7; i++) {
        if (dinnerlist[i] == 0) {
            newDinner =  Math.round(100 * Math.random() % (dinnerN-1)) + 1;

            checkIfDinnerPrev(dinnerlist, formulas(1), i);
            
            b = Math.random();
            if (i == 7) {
                dinnerlist[i+1] = dinnerlist[i];
            }
            else{
            if (i==6) {
                if (b<0.1) {
                    dinnerlist[i+1] == dinnerlist[i];
                }
            }
            if (i==5) {
                if (b<0.2) {
                    dinnerlist[i+1] == dinnerlist[i];
                }
                else if (b<0.5) {
                    dinnerlist[i+2] == dinnerlist[i];
                }
            }
            if (i<5) {
                if (b<0.2) {
                    dinnerlist[i+3] = dinnerlist[i];
                }
                else if(b<0.6) {
                    dinnerlist[i+2] = dinnerlist[i];
                }
                else if(b<0.8) {
                    dinnerlist[i+1] = dinnerlist[i];
                }
            }
            else if (i<4) {
                if (b<0.2) {
                    dinnerlist[i+3] = dinnerlist[i];
                }
                else if(b<0.6) {
                    dinnerlist[i+2] = dinnerlist[i];
                }
                else if(b<0.8) {
                    dinnerlist[i+1] = dinnerlist[i];
                }
            }
        }
        }
    }
    console.log(dinnerlist)

    document.getElementById("visibility").style.display = "block";
    document.getElementById("handleliste").style.display = "block";

    fillTable(dinnerlist);
    generated = true;
}

function checkIfDinnerPrev(dinnerlist, newDinner, i) {
    if ( !(dinnerlist.includes(newDinner)) ){
        dinnerlist[i] = newDinner;
    }
    else {
        checkIfDinnerPrev(dinnerlist, formulas(1), i);
    }
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

    printShoppingList(shoppingListAlt(dinnerlist));


}

function fillIngredients(tablepos, dinnerlist) {
    let ingredients = "";
    for (let i = 0; i < (dinners.dishes[dinnerlist[tablepos] - 1].ingredients).length; i++) {
        ingredients += ((dinners.dishes[dinnerlist[tablepos] - 1].ingredients[i]) + "<br>");
    }
    console.log(ingredients);
    return ingredients;
}

function finnIndividuellIngrediens(tablepos, dinnerlist, totalIngredients) {
    let ingredients = [];
    for (let i = 0; i < (dinners.dishes[dinnerlist[tablepos] - 1].ingredients).length; i++) {
        totalIngredients.push((dinners.dishes[dinnerlist[tablepos] - 1].ingredients[i]));
    }
    console.log(ingredients);
}

function shoppingList(dinnerlist) {
    let ingredientlist = [];
    for (let i = 0; i < dinnerlist.length; i++) {
            if (!ingredientlist.includes(dinnerlist[i])) {
                ingredientlist.push(dinnerlist[i]);
            }
    }
    console.log(ingredientlist);
    return ingredientlist;
}

function shoppingListAlt(dinnerlist) {
    let totalIngredients = [];
    for (let i = 0; i < 7; i++) {
        finnIndividuellIngrediens(i, dinnerlist, totalIngredients);
        //console.log(totalIngredients);
    }
    return totalIngredients;
}

function getIngredientPrice(ingredient_name) {
    console.log(ingredient_name);
    console.log(dinners.prices_total[ingredient_name]);
    return dinners.prices_total[ingredient_name];
}

function printShoppingList(ingredientlist) {
    console.log(ingredientlist);
    console.log(ingredientlist.length);
    let totalstk = 0;
    let totalprs = 0;
    var table = document.getElementById("handleTable");
    for(let i = 0; i < ingredientlist.length; i++) {
        var row = table.insertRow(i+1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        cell1.innerHTML=ingredientlist[i];
        cell2.innerHTML=getIngredientPrice(ingredientlist[i]);
        totalstk += getIngredientPrice(ingredientlist[i]);
        cell3.innerHTML=( (getIngredientPrice(ingredientlist[i])) /  dinners.ingredients_size[ingredientlist[i]] );
        totalprs += ( (getIngredientPrice(ingredientlist[i])) /  dinners.ingredients_size[ingredientlist[i]] );
    }

    var row = table.insertRow(ingredientlist.length+1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    cell1.innerHTML="<i>Total</i>";
    cell2.innerHTML=totalstk;
    cell3.innerHTML=totalprs;
}

function genNum(dinnerlist) {
    let a = Math.round(100 * Math.random() % 2) + 1;
}

function formulas(id) {
    if (id == 1) {
        console.log(Math.round(100 * Math.random() % (dinnerN-1)) + 1);
        return (Math.round(100 * Math.random() % (dinnerN-1)) + 1);   
    }
}