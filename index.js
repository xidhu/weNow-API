const express = require('express')
const body_parser = require("body-parser")
const axios = require('axios').default
const fs = require('fs');
const reg_ex_parser = require('regex-parser');
const {uniqueSort,isNear,removeDiacritics} = require("./functions")
var path = require('path')

const parser = body_parser.json({extended:true})

const app = express()
const port = process.env.PORT||3000
const url = "http://api.openweathermap.org/data/2.5/";
const apiKey = "&appid=API_KEY"
const cities = JSON.parse( fs.readFileSync("cities.json"));
const countries = JSON.parse( fs.readFileSync("countries.json"));


app.use(express.static(path.join(__dirname, 'public')))

app.get("/",(req,res)=>{
    res.send("index.html")
})

const getCountry = (countryCode) =>{
    let matched_country = "Unknown";
    countries.forEach((country)=>{
        if(countryCode == country.code)
            matched_country = country.name
    })
    return matched_country;
}

const isIdValid = (cityId) =>{
    var isValid = false;
    cities.forEach(city => {
        if(city.id == cityId){
            isValid = true;
        }
    });
    return isValid;
}


const getCities = (cityName,byCoordinates,lat,lon) =>{
    let matched_cities = [];
    let limiter = 0;
    if(byCoordinates){
        cities.forEach(city => {
            if(isNear(lat,lon,city.coord.lat,city.coord.lon,0.3) && limiter < 6){
                matched_cities.push(city);
                limiter++
            }
        });
    }else{
        let city_name = cityName.toLowerCase().replace(" ","");
        cities.forEach(city => {
            if(city.name.toLowerCase().replace(" ","").substring(0,city_name.length) == city_name && limiter < 6){
                matched_cities.push(city);
                limiter++
            }
        });
    }
    return matched_cities;
}



app.post("/city/query",parser,(req,res)=>{

    let cityquery = req.body.city
    let cities = getCities(cityquery,false,0,0).map((city)=>{
        return {
            "locId":city.id,
            "cityName":city.name,
            "countryName": city.country,
            "lon":city.coord.lon,
            "lat":city.coord.lat
        }
    });
    res.json(uniqueSort(cities,"cityName"));
});


app.post("/city/coord",parser,(req,res)=>{
    let lon = req.body.lon
    let lat = req.body.lat
    if(!(-90 < lat && lat < 90) ||!(-180 < lon && lon < 180)){
        res.json({
            "error":"Invalid Coordinates"
        });
    }else{
    let cities = getCities("",true,lat,lon).map((city)=>{
        return {
            "locId":city.id,
            "cityName":city.name,
            "countryName": city.country,
            "lon":city.coord.lon,
            "lat":city.coord.lat
        }
    });
    res.json(uniqueSort(cities,"cityName"));
    }
})

app.post("/weather/id",parser,(req,res)=>{
    let id = req.body.id
    if(!isIdValid(id)){
        res.json({
            "error":"Invalid Id"
        });
    }else{
    let requestUrl = url+"weather?id="+id+apiKey
    axios.get(requestUrl).then((resp)=>{
        
        let data = resp.data
        res.json({
            "date":data.dt,
            "locId":data.id,
            "cityName":removeDiacritics(data.name),
            "countryName":getCountry(data.sys.country),
            "currentWeather":data.weather[0].main,
            "weatherIcon":"http://openweathermap.org/img/w/"+data.weather[0].icon+".png",
            "currentTemperature":data.main.temp,
        })
    }).catch((err)=>{
        res.json({status:error});
    })
}
})

app.post("/weather/coord/full",parser,(req,res)=>{
    let lon = req.body.lon
    let lat = req.body.lat
    if(!(-90 < lat && lat < 90) ||!(-180 < lon && lon < 180)){
        res.json({
            "error":"Invalid Coordinates"
        });
    }else{
    let requestUrl = url+"onecall?lat="+lat+"&lon="+lon+"&exclude=alerts"+apiKey
    axios.get(requestUrl).then((resp)=>{
        let data = resp.data
        let hourlyData = data.hourly.map((hdata)=>{
            return {
                "time":hdata.dt,
                "temperature":hdata.temp,
                "weather":hdata.weather[0].main,
                "weatherIcon":"http://openweathermap.org/img/w/"+hdata.weather[0].icon+".png",
            }
        })

        let dailyData = data.daily.map((hdata)=>{
            return {
                "time":hdata.dt,
                "temperature":hdata.temp.day,
                "weather":hdata.weather[0].main,
                "weatherIcon":"http://openweathermap.org/img/w/"+hdata.weather[0].icon+".png",
            }
            
        })

        let tommorowData = {
            "date":data.daily[1].dt,
            "temperature":(data.daily[1].temp.min +data.daily[1].temp.max)/2,
            "uvi":data.daily[1].uvi,
            "wind":data.daily[1].wind_speed,
            "humidity":data.daily[1].humidity,
            "weather":data.daily[1].weather[0].main,
            "weatherIcon":"http://openweathermap.org/img/w/"+data.daily[1].weather[0].icon+".png",

        }
        res.json({
            "date":data.current.dt,
            "currentWeather":data.current.weather[0].main,
            "weatherIcon":"http://openweathermap.org/img/w/"+data.current.weather[0].icon+".png",
            "currentTemperature":data.current.temp,
            "uvi":data.current.uvi,
            "currentWind":data.current.wind_speed,
            "currentHumidity":data.current.humidity,
            "tommorrowData":tommorowData,
            "hourlyData":hourlyData,
            "dailyData":dailyData
        })

        
        
    }).catch((err)=>{
        res.json({status:error});
    })
} 
})

app.listen(port, () => console.log("Listening to port "+port))