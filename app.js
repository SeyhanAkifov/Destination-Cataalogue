let errorBox = document.getElementsByClassName('notification errorBox')[0];
let successBox = document.getElementsByClassName('notification infoBox')[0];
let loading = document.getElementsByClassName('notification loadingBox')[0];

const router = Sammy('#container', function () {

    this.use('Handlebars', 'hbs');

    this.get('/', async function (context) {
        context.redirect('/home')
    });

    this.get('/home', async function (context) {


        checkAuth(context);

        loading.textContent = "Loading...";
        loading.style.display = "inline-block";
        await fetch('https://examjs-fffcc-default-rtdb.firebaseio.com/.json')

            .then(response => response.json())
            .then(data => {

                if (data) {

                    Object.keys(data).map(key => (data[key].creator == context.email ? data[key].isAuthor = true : ""))
                    
                    context.destinations = Object.keys(data).map(key => ({ key, ...data[key] }));
                 }
            })




        await this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs',
            'destination': './templates/catalog/destination.hbs'
        }).then(function () {
            this.partial('../templates/catalog/home.hbs')
        }).then(loading.style.display = "none")

    });

    this.get('/login', function (context) {
        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs'
        }).then(function () {
            this.partial('../templates/login/loginPage.hbs')
        })


    });

    this.post('/login', function (context) {


        const { email, password } = context.params

        if (!email || !password) {
            return
        }
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userInfo) => {
                localStorage.setItem('userInfo', JSON.stringify({ uid: userInfo.user.uid, email: userInfo.user.email }));
                context.redirect('/home')
                showMessage(successBox, "Login successful.");
            })
            .catch(function (error) {
                
                var errorCode = error.code;
                var errorMessage = error.message;
                showMessage(errorBox, error.message);
            });
    });


    this.get('/register', function () {

        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs'
        }).then(function () {
            this.partial('../templates/register/registerPage.hbs')
        })
    });

    this.post('/register', function (context) {
        const { email, password, rePassword } = context.params;

        if (!email || !password || !rePassword) {
            showMessage(errorBox, "Invalid inputs");
            return
        }
        if (password !== rePassword) {

            showMessage(errorBox, "Passwords doesnt match");
            return;
        }
        console.log(context)

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((createdUser) => {
                context.redirect('/login')
                showMessage(successBox, "User registration successful.");
            })
            .catch(function (error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                showMessage(errorBox, errorMessage);
                
            });
    });

    this.get('/logout', function (context) {
        console.log(context)
        firebase.auth().signOut()
            .then(function () {
                localStorage.removeItem('userInfo');
                context.loggedIn = false
                context.redirect('/home');
                showMessage(successBox, "Logout successful");
            }).catch(function (error) {
                showMessage(errorBox, error.message);
            })

    });

    this.get('/create', function (context) {
        checkAuth(context);
        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs'

        }).then(function () {
            this.partial('../templates/create/createPage.hbs')
        })
    });

    this.post('/create',  function (context) {

        checkAuth(context);
        const { destination, city, duration, departureDate, imgUrl } = context.params;


        if (!destination || !city || !duration || !departureDate || !imgUrl) {
            showMessage(errorBox, "All input fields shouldn’t be empty")
            return
        }




        if(duration < 1 || duration > 100) {
            showMessage(errorBox, 'Duration must be between 1…100');
            return
        }

        loading.textContent = "Loading...";
        loading.style.display = "inline-block";
        fetch('https://examjs-fffcc-default-rtdb.firebaseio.com/.json',
            {
                method: "POST",
                body: JSON.stringify({
                    destination,
                    city,
                    duration,
                    departureDate,
                    imgUrl,
                    creator: context.email

                })
            })
            .then(loading.style.display = "none")
            .then(showMessage(successBox, 'Successfuly created destination'))
            .then(async () => await context.redirect('/home'))

        


    });

    this.get('/details/:id',  async function (context) {

        checkAuth(context);
        loading.textContent = "Loading...";
        loading.style.display = "inline-block";

        await fetch(`https://examjs-fffcc-default-rtdb.firebaseio.com/${context.params.id}.json`)
            .then(response => response.json())
            .then(data => {
                context.city = data.city;
                context.destination = data.destination;
                context.duration = data.duration;
                context.creator = data.creator;
                context.imgUrl = data.imgUrl;
                context.departureDate = data.departureDate

                context.isAuthor = data.creator == context.email ? true : undefined


            })



        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs'
        }).then(function () {
            this.partial('../templates/details/details.hbs')
        })
        .then(loading.style.display = "none");

        context.key = context.params.id
    });

    this.get('/delete/:id', async function (context) {

        checkAuth(context);

        await fetch(`https://examjs-fffcc-default-rtdb.firebaseio.com/${context.params.id}.json`, {
            method: "DELETE"
        });
        showMessage(successBox, 'Destination deleted.');
        context.redirect('/destinations');


    });

    this.get('/edit/:id', async function (context) {

        checkAuth(context);
        await fetch(`https://examjs-fffcc-default-rtdb.firebaseio.com/${context.params.id}.json`)
            .then(response => response.json())
            .then(data => {
                context.city = data.city;
                context.destination = data.destination;
                context.departureDate = data.departureDate;
                context.imgUrl = data.imgUrl;
                context.duration = data.duration
                context.email = data.creator;
                context.creator = data.creator;
            });

        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs'


        }).then(function () {
            this.partial('../templates/edit/editPage.hbs')
        });

        context.key = context.params.id

    });

    this.post('/edit/:id', function (context) {

        checkAuth(context);

        const { destination, city, duration, departureDate, imgUrl } = context.params;


        if (!destination) {
            showMessage(errorBox, "destination name shouldn’t be empty")
            return
        }
        if (!city) {
            showMessage(errorBox, "city name shouldn’t be empty")
            return
        }
        if (!duration) {
            showMessage(errorBox, "duration shouldn’t be empty")
            return
        }
        if (!departureDate) {
            showMessage(errorBox, "departureDate shouldn’t be empty")
            return
        }
        if (!imgUrl) {
            showMessage(errorBox, "imageUrl shouldn’t be empty")
            return
        }

        if(duration < 1 || duration > 100) {
            showMessage(errorBox, 'Duration must be between 1…100');
            return
        }





        let obj = {
            destination,
            city,
            duration,
            departureDate,
            imgUrl,


        };

        fetch(`https://examjs-fffcc-default-rtdb.firebaseio.com/${context.params.id}.json`,
            {
                method: "PATCH",
                body: JSON.stringify(obj)
            })
            .then(async () => await context.redirect(`/details/${context.params.id}`));
        showMessage(successBox, 'Successfully edited destination')

    });

    this.get('/destinations', async function (context) {

        checkAuth(context);
        loading.textContent = "Loading...";
        loading.style.display = "inline-block";
        await fetch('https://examjs-fffcc-default-rtdb.firebaseio.com/.json')
            .then(response => response.json())
            .then(data => {
                if (data) {

                    Object.keys(data).map(key => (data[key].creator == context.email ? data[key].isAuthor = true : ""))

                    let destinations = Object.keys(data).map(key => ({ key, ...data[key] }));
                    context.destinations = destinations.filter(x => x.creator == context.email);


                }
            })

        this.loadPartials({
            'header': './templates/common/header.hbs',
            'footer': './templates/common/footer.hbs',
            'destination-details': './templates/catalog/destination-details.hbs',
        }).then(function () {
            this.partial('../templates/catalog/destinations.hbs')
        })
        .then(loading.style.display = "none");

    })



    function checkAuth(context) {

        if (localStorage.userInfo) {
            const { uid, email } = JSON.parse(localStorage.userInfo)
            context.loggedIn = true;
            context.uid = uid;
            context.email = email;
        };
    };

    function showMessage(type, message) {


        type.textContent = message;
        type.style.display = "inline-block";


        setTimeout(() => {
            type.style.display = "none"
        }, 3000)


    };
});

(() => {
    router.run();
})()