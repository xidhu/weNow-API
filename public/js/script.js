
const openNavSlide = () =>{
    let navSlide = document.getElementById("nav-slide");
    navSlide.style.left = "0vw";
    document.getElementsByClassName("content")[0].addEventListener("click",(evt)=>{
        navSlide.style.left = "-50vw";
    })
}

const closeNavSlide = () =>{
    let navSlide = document.getElementById("nav-slide");
    navSlide.style.left = "-50vw";
}