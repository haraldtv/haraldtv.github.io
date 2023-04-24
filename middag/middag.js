let dinners = {
    "id": 1,
    "name": "Retter",
    "dishes": [{
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
    }
]
}


function generateDinners() {
    console.log(dinners.dishes[0].dish);
}

