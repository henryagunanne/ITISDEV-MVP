document.addEventListener("DOMContentLoaded", function(){

const adminDashboardData = {

cards: [

{ title: "Games Played", value: "0" },

{ title: "AVG Points", value: "0" },

{ title: "AVG Rebounds", value: "0" },

{ title: "Record (W-L)", value: "0-0" }

]

};



// RENDER SUMMARY CARDS
const cardTemplateSource =
document.getElementById("admin-card-template").innerHTML;

const cardTemplate =
Handlebars.compile(cardTemplateSource);

document.getElementById("admin-summary-cards").innerHTML =
cardTemplate(adminDashboardData);



// RENDER LEADERBOARDS
const leaderTemplateSource =
document.getElementById("admin-leader-template").innerHTML;

const leaderTemplate =
Handlebars.compile(leaderTemplateSource);

document.getElementById("admin-leaderboards").innerHTML =
leaderTemplate({});

});

console.log("Admin Dashboard Loaded");