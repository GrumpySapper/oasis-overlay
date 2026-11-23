/* Oasis Radio – Song Hangman shared logic.
   Used by song-hangman.html (overlay) and song-hangman-control.html.
   Preview only: no live pages are changed. Chat play on air needs a small
   Bob backend addition (documented on the control page); this lib also
   accepts future SSE events of type "hangman" or raw "chat"/"comment".
   The puzzle is the SONG TITLE and the BAND, both hidden as letter blanks. Letters count if they are in
   either; typing the title (or "title by band") solves it. The decade/year is an optional host hint. */
(function (root) {
  const LIVES = 7;
  const LETTER_THROTTLE_MS = 1000;
  const USER_COOLDOWN_MS = 4000;
  const CHANNEL = 'oasis-song-hangman';
  const STORE = 'oasisSongHangman';

  // Puzzle = song title + band. 500 songs spread evenly 1950s-2020s (about 62 per decade), max 3 per artist,
  // no Christmas songs. year = original release year, used for the decade/year hint.
  const SONGS = [
    { title: "Mona Lisa", artist: "Nat King Cole", year: 1950 },
    { title: "Unforgettable", artist: "Nat King Cole", year: 1951 },
    { title: "Earth Angel", artist: "The Penguins", year: 1954 },
    { title: "I Got a Woman", artist: "Ray Charles", year: 1954 },
    { title: "Mr. Sandman", artist: "The Chordettes", year: 1954 },
    { title: "Sh-Boom", artist: "The Chords", year: 1954 },
    { title: "Ain't That a Shame", artist: "Fats Domino", year: 1955 },
    { title: "Cry Me a River", artist: "Julie London", year: 1955 },
    { title: "Folsom Prison Blues", artist: "Johnny Cash", year: 1955 },
    { title: "Love and Marriage", artist: "Frank Sinatra", year: 1955 },
    { title: "Maybellene", artist: "Chuck Berry", year: 1955 },
    { title: "Only You (And You Alone)", artist: "The Platters", year: 1955 },
    { title: "Rock Island Line", artist: "Lonnie Donegan", year: 1955 },
    { title: "See You Later, Alligator", artist: "Bill Haley & His Comets", year: 1955 },
    { title: "The Great Pretender", artist: "The Platters", year: 1955 },
    { title: "Tutti Frutti", artist: "Little Richard", year: 1955 },
    { title: "Be-Bop-a-Lula", artist: "Gene Vincent", year: 1956 },
    { title: "Blue Suede Shoes", artist: "Carl Perkins", year: 1956 },
    { title: "Blueberry Hill", artist: "Fats Domino", year: 1956 },
    { title: "Heartbreak Hotel", artist: "Elvis Presley", year: 1956 },
    { title: "I Walk the Line", artist: "Johnny Cash", year: 1956 },
    { title: "Long Tall Sally", artist: "Little Richard", year: 1956 },
    { title: "Que Sera, Sera", artist: "Doris Day", year: 1956 },
    { title: "Roll Over Beethoven", artist: "Chuck Berry", year: 1956 },
    { title: "Why Do Fools Fall in Love", artist: "Frankie Lymon & the Teenagers", year: 1956 },
    { title: "At the Hop", artist: "Danny & the Juniors", year: 1957 },
    { title: "Bye Bye Love", artist: "The Everly Brothers", year: 1957 },
    { title: "Diana", artist: "Paul Anka", year: 1957 },
    { title: "Great Balls of Fire", artist: "Jerry Lee Lewis", year: 1957 },
    { title: "Little Darlin'", artist: "The Diamonds", year: 1957 },
    { title: "Peggy Sue", artist: "Buddy Holly", year: 1957 },
    { title: "Reet Petite", artist: "Jackie Wilson", year: 1957 },
    { title: "That'll Be the Day", artist: "The Crickets", year: 1957 },
    { title: "Wake Up Little Susie", artist: "The Everly Brothers", year: 1957 },
    { title: "Whole Lotta Shakin' Goin' On", artist: "Jerry Lee Lewis", year: 1957 },
    { title: "All I Have to Do Is Dream", artist: "The Everly Brothers", year: 1958 },
    { title: "C'mon Everybody", artist: "Eddie Cochran", year: 1958 },
    { title: "Chantilly Lace", artist: "The Big Bopper", year: 1958 },
    { title: "Come Fly with Me", artist: "Frank Sinatra", year: 1958 },
    { title: "Donna", artist: "Ritchie Valens", year: 1958 },
    { title: "Fever", artist: "Peggy Lee", year: 1958 },
    { title: "Good Golly, Miss Molly", artist: "Little Richard", year: 1958 },
    { title: "La Bamba", artist: "Ritchie Valens", year: 1958 },
    { title: "Lollipop", artist: "The Chordettes", year: 1958 },
    { title: "Lonely Teardrops", artist: "Jackie Wilson", year: 1958 },
    { title: "Move It", artist: "Cliff Richard", year: 1958 },
    { title: "Rave On", artist: "Buddy Holly", year: 1958 },
    { title: "Rockin' Robin", artist: "Bobby Day", year: 1958 },
    { title: "Smoke Gets in Your Eyes", artist: "The Platters", year: 1958 },
    { title: "Splish Splash", artist: "Bobby Darin", year: 1958 },
    { title: "Stagger Lee", artist: "Lloyd Price", year: 1958 },
    { title: "Summertime Blues", artist: "Eddie Cochran", year: 1958 },
    { title: "Tequila", artist: "The Champs", year: 1958 },
    { title: "Yakety Yak", artist: "The Coasters", year: 1958 },
    { title: "Beyond the Sea", artist: "Bobby Darin", year: 1959 },
    { title: "Charlie Brown", artist: "The Coasters", year: 1959 },
    { title: "Living Doll", artist: "Cliff Richard", year: 1959 },
    { title: "Mack the Knife", artist: "Bobby Darin", year: 1959 },
    { title: "Poison Ivy", artist: "The Coasters", year: 1959 },
    { title: "Put Your Head on My Shoulder", artist: "Paul Anka", year: 1959 },
    { title: "There Goes My Baby", artist: "The Drifters", year: 1959 },
    { title: "What'd I Say", artist: "Ray Charles", year: 1959 },
    { title: "Crying", artist: "Roy Orbison", year: 1961 },
    { title: "Runaway", artist: "Del Shannon", year: 1961 },
    { title: "Sherry", artist: "The Four Seasons", year: 1962 },
    { title: "Twistin' the Night Away", artist: "Sam Cooke", year: 1962 },
    { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
    { title: "Da Doo Ron Ron", artist: "The Crystals", year: 1963 },
    { title: "Louie Louie", artist: "The Kingsmen", year: 1963 },
    { title: "Walk Like a Man", artist: "The Four Seasons", year: 1963 },
    { title: "A Change Is Gonna Come", artist: "Sam Cooke", year: 1964 },
    { title: "Dancing in the Street", artist: "Martha and the Vandellas", year: 1964 },
    { title: "Do Wah Diddy Diddy", artist: "Manfred Mann", year: 1964 },
    { title: "Downtown", artist: "Petula Clark", year: 1964 },
    { title: "Leader of the Pack", artist: "The Shangri-Las", year: 1964 },
    { title: "Oh, Pretty Woman", artist: "Roy Orbison", year: 1964 },
    { title: "She's Not There", artist: "The Zombies", year: 1964 },
    { title: "The House of the Rising Sun", artist: "The Animals", year: 1964 },
    { title: "You Really Got Me", artist: "The Kinks", year: 1964 },
    { title: "California Dreamin'", artist: "The Mamas & the Papas", year: 1965 },
    { title: "Hang On Sloopy", artist: "The McCoys", year: 1965 },
    { title: "Like a Rolling Stone", artist: "Bob Dylan", year: 1965 },
    { title: "Mr. Tambourine Man", artist: "The Byrds", year: 1965 },
    { title: "My Generation", artist: "The Who", year: 1965 },
    { title: "Stop! In the Name of Love", artist: "The Supremes", year: 1965 },
    { title: "Subterranean Homesick Blues", artist: "Bob Dylan", year: 1965 },
    { title: "The Tracks of My Tears", artist: "The Miracles", year: 1965 },
    { title: "Turn! Turn! Turn!", artist: "The Byrds", year: 1965 },
    { title: "All or Nothing", artist: "Small Faces", year: 1966 },
    { title: "Eleanor Rigby", artist: "The Beatles", year: 1966 },
    { title: "God Only Knows", artist: "The Beach Boys", year: 1966 },
    { title: "I'm a Believer", artist: "The Monkees", year: 1966 },
    { title: "Mellow Yellow", artist: "Donovan", year: 1966 },
    { title: "Mustang Sally", artist: "Wilson Pickett", year: 1966 },
    { title: "Paint It Black", artist: "The Rolling Stones", year: 1966 },
    { title: "Reach Out I'll Be There", artist: "Four Tops", year: 1966 },
    { title: "Strangers in the Night", artist: "Frank Sinatra", year: 1966 },
    { title: "Try a Little Tenderness", artist: "Otis Redding", year: 1966 },
    { title: "Wild Thing", artist: "The Troggs", year: 1966 },
    { title: "You Don't Have to Say You Love Me", artist: "Dusty Springfield", year: 1966 },
    { title: "A Whiter Shade of Pale", artist: "Procol Harum", year: 1967 },
    { title: "Chain of Fools", artist: "Aretha Franklin", year: 1967 },
    { title: "I Second That Emotion", artist: "The Miracles", year: 1967 },
    { title: "Itchycoo Park", artist: "Small Faces", year: 1967 },
    { title: "Nights in White Satin", artist: "The Moody Blues", year: 1967 },
    { title: "Ruby Tuesday", artist: "The Rolling Stones", year: 1967 },
    { title: "Somebody to Love", artist: "Jefferson Airplane", year: 1967 },
    { title: "Soul Man", artist: "Sam & Dave", year: 1967 },
    { title: "Sunshine of Your Love", artist: "Cream", year: 1967 },
    { title: "Waterloo Sunset", artist: "The Kinks", year: 1967 },
    { title: "White Rabbit", artist: "Jefferson Airplane", year: 1967 },
    { title: "All Along the Watchtower", artist: "The Jimi Hendrix Experience", year: 1968 },
    { title: "Crimson and Clover", artist: "Tommy James and the Shondells", year: 1968 },
    { title: "Everyday People", artist: "Sly and the Family Stone", year: 1968 },
    { title: "I Heard It Through the Grapevine", artist: "Marvin Gaye", year: 1968 },
    { title: "Mrs. Robinson", artist: "Simon & Garfunkel", year: 1968 },
    { title: "Son of a Preacher Man", artist: "Dusty Springfield", year: 1968 },
    { title: "Time of the Season", artist: "The Zombies", year: 1968 },
    { title: "Wichita Lineman", artist: "Glen Campbell", year: 1968 },
    { title: "Bad Moon Rising", artist: "Creedence Clearwater Revival", year: 1969 },
    { title: "Fortunate Son", artist: "Creedence Clearwater Revival", year: 1969 },
    { title: "Gimme Shelter", artist: "The Rolling Stones", year: 1969 },
    { title: "Proud Mary", artist: "Creedence Clearwater Revival", year: 1969 },
    { title: "Sugar, Sugar", artist: "The Archies", year: 1969 },
    { title: "Venus", artist: "Shocking Blue", year: 1969 },
    { title: "Black Night", artist: "Deep Purple", year: 1970 },
    { title: "Instant Karma!", artist: "John Lennon", year: 1970 },
    { title: "Iron Man", artist: "Black Sabbath", year: 1970 },
    { title: "Layla", artist: "Derek and the Dominos", year: 1970 },
    { title: "Paranoid", artist: "Black Sabbath", year: 1970 },
    { title: "American Pie", artist: "Don McLean", year: 1971 },
    { title: "Let's Stay Together", artist: "Al Green", year: 1971 },
    { title: "Life on Mars?", artist: "David Bowie", year: 1971 },
    { title: "Maggie May", artist: "Rod Stewart", year: 1971 },
    { title: "Tiny Dancer", artist: "Elton John", year: 1971 },
    { title: "Won't Get Fooled Again", artist: "The Who", year: 1971 },
    { title: "Do It Again", artist: "Steely Dan", year: 1972 },
    { title: "Lean on Me", artist: "Bill Withers", year: 1972 },
    { title: "Reelin' in the Years", artist: "Steely Dan", year: 1972 },
    { title: "Rocket Man", artist: "Elton John", year: 1972 },
    { title: "Superstition", artist: "Stevie Wonder", year: 1972 },
    { title: "Take It Easy", artist: "Eagles", year: 1972 },
    { title: "Whiskey in the Jar", artist: "Thin Lizzy", year: 1972 },
    { title: "20th Century Boy", artist: "T. Rex", year: 1973 },
    { title: "Dream On", artist: "Aerosmith", year: 1973 },
    { title: "Free Bird", artist: "Lynyrd Skynyrd", year: 1973 },
    { title: "Piano Man", artist: "Billy Joel", year: 1973 },
    { title: "Killer Queen", artist: "Queen", year: 1974 },
    { title: "Born to Run", artist: "Bruce Springsteen", year: 1975 },
    { title: "Jive Talkin'", artist: "Bee Gees", year: 1975 },
    { title: "Rhiannon", artist: "Fleetwood Mac", year: 1975 },
    { title: "Walk This Way", artist: "Aerosmith", year: 1975 },
    { title: "Anarchy in the U.K.", artist: "Sex Pistols", year: 1976 },
    { title: "Car Wash", artist: "Rose Royce", year: 1976 },
    { title: "Don't Leave Me This Way", artist: "Thelma Houston", year: 1976 },
    { title: "Go Your Own Way", artist: "Fleetwood Mac", year: 1976 },
    { title: "Life in the Fast Lane", artist: "Eagles", year: 1976 },
    { title: "Livin' Thing", artist: "Electric Light Orchestra", year: 1976 },
    { title: "More Than a Feeling", artist: "Boston", year: 1976 },
    { title: "Year of the Cat", artist: "Al Stewart", year: 1976 },
    { title: "Bat Out of Hell", artist: "Meat Loaf", year: 1977 },
    { title: "Black Betty", artist: "Ram Jam", year: 1977 },
    { title: "I Feel Love", artist: "Donna Summer", year: 1977 },
    { title: "Lovely Day", artist: "Bill Withers", year: 1977 },
    { title: "Mr. Blue Sky", artist: "Electric Light Orchestra", year: 1977 },
    { title: "Pretty Vacant", artist: "Sex Pistols", year: 1977 },
    { title: "Psycho Killer", artist: "Talking Heads", year: 1977 },
    { title: "Watching the Detectives", artist: "Elvis Costello", year: 1977 },
    { title: "Baker Street", artist: "Gerry Rafferty", year: 1978 },
    { title: "Da Ya Think I'm Sexy?", artist: "Rod Stewart", year: 1978 },
    { title: "Don't Stop Me Now", artist: "Queen", year: 1978 },
    { title: "Down in the Tube Station at Midnight", artist: "The Jam", year: 1978 },
    { title: "Ever Fallen in Love", artist: "Buzzcocks", year: 1978 },
    { title: "Hit Me with Your Rhythm Stick", artist: "Ian Dury and the Blockheads", year: 1978 },
    { title: "Hold the Line", artist: "Toto", year: 1978 },
    { title: "Hong Kong Garden", artist: "Siouxsie and the Banshees", year: 1978 },
    { title: "Is She Really Going Out with Him?", artist: "Joe Jackson", year: 1978 },
    { title: "Rock Lobster", artist: "The B-52's", year: 1978 },
    { title: "September", artist: "Earth, Wind & Fire", year: 1978 },
    { title: "Sultans of Swing", artist: "Dire Straits", year: 1978 },
    { title: "Wuthering Heights", artist: "Kate Bush", year: 1978 },
    { title: "Are 'Friends' Electric?", artist: "Tubeway Army", year: 1979 },
    { title: "Atomic", artist: "Blondie", year: 1979 },
    { title: "Boogie Wonderland", artist: "Earth, Wind & Fire", year: 1979 },
    { title: "Good Times", artist: "Chic", year: 1979 },
    { title: "Hot Stuff", artist: "Donna Summer", year: 1979 },
    { title: "Video Killed the Radio Star", artist: "The Buggles", year: 1979 },
    { title: "Walking on the Moon", artist: "The Police", year: 1979 },
    { title: "Ace of Spades", artist: "Motorhead", year: 1980 },
    { title: "Enola Gay", artist: "Orchestral Manoeuvres in the Dark", year: 1980 },
    { title: "Fade to Grey", artist: "Visage", year: 1980 },
    { title: "Going Underground", artist: "The Jam", year: 1980 },
    { title: "Love Will Tear Us Apart", artist: "Joy Division", year: 1980 },
    { title: "Mirror in the Bathroom", artist: "The Beat", year: 1980 },
    { title: "Once in a Lifetime", artist: "Talking Heads", year: 1980 },
    { title: "Ghost Town", artist: "The Specials", year: 1981 },
    { title: "Jessie's Girl", artist: "Rick Springfield", year: 1981 },
    { title: "Just Can't Get Enough", artist: "Depeche Mode", year: 1981 },
    { title: "Do You Really Want to Hurt Me", artist: "Culture Club", year: 1982 },
    { title: "Hungry Like the Wolf", artist: "Duran Duran", year: 1982 },
    { title: "Little Red Corvette", artist: "Prince", year: 1982 },
    { title: "Mad World", artist: "Tears for Fears", year: 1982 },
    { title: "Rio", artist: "Duran Duran", year: 1982 },
    { title: "Run to the Hills", artist: "Iron Maiden", year: 1982 },
    { title: "Town Called Malice", artist: "The Jam", year: 1982 },
    { title: "Wanna Be Startin' Somethin'", artist: "Michael Jackson", year: 1982 },
    { title: "White Wedding", artist: "Billy Idol", year: 1982 },
    { title: "Gold", artist: "Spandau Ballet", year: 1983 },
    { title: "I'm Still Standing", artist: "Elton John", year: 1983 },
    { title: "Karma Chameleon", artist: "Culture Club", year: 1983 },
    { title: "Rebel Yell", artist: "Billy Idol", year: 1983 },
    { title: "Relax", artist: "Frankie Goes to Hollywood", year: 1983 },
    { title: "This Charming Man", artist: "The Smiths", year: 1983 },
    { title: "Footloose", artist: "Kenny Loggins", year: 1984 },
    { title: "Ghostbusters", artist: "Ray Parker Jr.", year: 1984 },
    { title: "Here Comes the Rain Again", artist: "Eurythmics", year: 1984 },
    { title: "How Soon Is Now?", artist: "The Smiths", year: 1984 },
    { title: "Panama", artist: "Van Halen", year: 1984 },
    { title: "Pride (In the Name of Love)", artist: "U2", year: 1984 },
    { title: "Smalltown Boy", artist: "Bronski Beat", year: 1984 },
    { title: "The Killing Moon", artist: "Echo & the Bunnymen", year: 1984 },
    { title: "Two Tribes", artist: "Frankie Goes to Hollywood", year: 1984 },
    { title: "When Doves Cry", artist: "Prince", year: 1984 },
    { title: "Don't You (Forget About Me)", artist: "Simple Minds", year: 1985 },
    { title: "Everybody Wants to Rule the World", artist: "Tears for Fears", year: 1985 },
    { title: "Hounds of Love", artist: "Kate Bush", year: 1985 },
    { title: "Don't Dream It's Over", artist: "Crowded House", year: 1986 },
    { title: "Sledgehammer", artist: "Peter Gabriel", year: 1986 },
    { title: "The Final Countdown", artist: "Europe", year: 1986 },
    { title: "There Is a Light That Never Goes Out", artist: "The Smiths", year: 1986 },
    { title: "True Colors", artist: "Cyndi Lauper", year: 1986 },
    { title: "Wanted Dead or Alive", artist: "Bon Jovi", year: 1986 },
    { title: "Heaven Is a Place on Earth", artist: "Belinda Carlisle", year: 1987 },
    { title: "It's a Sin", artist: "Pet Shop Boys", year: 1987 },
    { title: "Need You Tonight", artist: "INXS", year: 1987 },
    { title: "Pump Up the Volume", artist: "MARRS", year: 1987 },
    { title: "Push It", artist: "Salt-N-Pepa", year: 1987 },
    { title: "Smooth Criminal", artist: "Michael Jackson", year: 1987 },
    { title: "The One I Love", artist: "R.E.M.", year: 1987 },
    { title: "True Faith", artist: "New Order", year: 1987 },
    { title: "Welcome to the Jungle", artist: "Guns N' Roses", year: 1987 },
    { title: "It Takes Two", artist: "Rob Base and DJ E-Z Rock", year: 1988 },
    { title: "One", artist: "Metallica", year: 1988 },
    { title: "Straight Outta Compton", artist: "N.W.A", year: 1988 },
    { title: "Where Is My Mind?", artist: "Pixies", year: 1988 },
    { title: "Debaser", artist: "Pixies", year: 1989 },
    { title: "Fools Gold", artist: "The Stone Roses", year: 1989 },
    { title: "I Wanna Be Adored", artist: "The Stone Roses", year: 1989 },
    { title: "Like a Prayer", artist: "Madonna", year: 1989 },
    { title: "Ride on Time", artist: "Black Box", year: 1989 },
    { title: "Enjoy the Silence", artist: "Depeche Mode", year: 1990 },
    { title: "Loaded", artist: "Primal Scream", year: 1990 },
    { title: "The Only One I Know", artist: "The Charlatans", year: 1990 },
    { title: "Thunderstruck", artist: "AC/DC", year: 1990 },
    { title: "Alive", artist: "Pearl Jam", year: 1991 },
    { title: "Come as You Are", artist: "Nirvana", year: 1991 },
    { title: "Give It Away", artist: "Red Hot Chili Peppers", year: 1991 },
    { title: "Jeremy", artist: "Pearl Jam", year: 1991 },
    { title: "Lithium", artist: "Nirvana", year: 1991 },
    { title: "Losing My Religion", artist: "R.E.M.", year: 1991 },
    { title: "Movin' On Up", artist: "Primal Scream", year: 1991 },
    { title: "Unfinished Sympathy", artist: "Massive Attack", year: 1991 },
    { title: "Creep", artist: "Radiohead", year: 1992 },
    { title: "Everybody Hurts", artist: "R.E.M.", year: 1992 },
    { title: "Fear of the Dark", artist: "Iron Maiden", year: 1992 },
    { title: "Friday I'm in Love", artist: "The Cure", year: 1992 },
    { title: "Killing in the Name", artist: "Rage Against the Machine", year: 1992 },
    { title: "Motorcycle Emptiness", artist: "Manic Street Preachers", year: 1992 },
    { title: "Disarm", artist: "The Smashing Pumpkins", year: 1993 },
    { title: "Heart-Shaped Box", artist: "Nirvana", year: 1993 },
    { title: "Insane in the Brain", artist: "Cypress Hill", year: 1993 },
    { title: "Laid", artist: "James", year: 1993 },
    { title: "Mr. Jones", artist: "Counting Crows", year: 1993 },
    { title: "Today", artist: "The Smashing Pumpkins", year: 1993 },
    { title: "What Is Love", artist: "Haddaway", year: 1993 },
    { title: "Basket Case", artist: "Green Day", year: 1994 },
    { title: "Black Hole Sun", artist: "Soundgarden", year: 1994 },
    { title: "Glory Box", artist: "Portishead", year: 1994 },
    { title: "Juicy", artist: "The Notorious B.I.G.", year: 1994 },
    { title: "Kiss from a Rose", artist: "Seal", year: 1994 },
    { title: "Live Forever", artist: "Oasis", year: 1994 },
    { title: "Streets of Philadelphia", artist: "Bruce Springsteen", year: 1994 },
    { title: "Supersonic", artist: "Oasis", year: 1994 },
    { title: "Zombie", artist: "The Cranberries", year: 1994 },
    { title: "Alright", artist: "Supergrass", year: 1995 },
    { title: "Champagne Supernova", artist: "Oasis", year: 1995 },
    { title: "Common People", artist: "Pulp", year: 1995 },
    { title: "Disco 2000", artist: "Pulp", year: 1995 },
    { title: "Fake Plastic Trees", artist: "Radiohead", year: 1995 },
    { title: "Gangsta's Paradise", artist: "Coolio", year: 1995 },
    { title: "Ironic", artist: "Alanis Morissette", year: 1995 },
    { title: "Tonight, Tonight", artist: "The Smashing Pumpkins", year: 1995 },
    { title: "Wake Up Boo!", artist: "The Boo Radleys", year: 1995 },
    { title: "You Oughta Know", artist: "Alanis Morissette", year: 1995 },
    { title: "A Design for Life", artist: "Manic Street Preachers", year: 1996 },
    { title: "Breathe", artist: "The Prodigy", year: 1996 },
    { title: "Firestarter", artist: "The Prodigy", year: 1996 },
    { title: "Killing Me Softly", artist: "Fugees", year: 1996 },
    { title: "Lovefool", artist: "The Cardigans", year: 1996 },
    { title: "Ready or Not", artist: "Fugees", year: 1996 },
    { title: "You're Gorgeous", artist: "Babybird", year: 1996 },
    { title: "Bitter Sweet Symphony", artist: "The Verve", year: 1997 },
    { title: "Karma Police", artist: "Radiohead", year: 1997 },
    { title: "Semi-Charmed Life", artist: "Third Eye Blind", year: 1997 },
    { title: "Song 2", artist: "Blur", year: 1997 },
    { title: "The Drugs Don't Work", artist: "The Verve", year: 1997 },
    { title: "Tubthumping", artist: "Chumbawamba", year: 1997 },
    { title: "Doo Wop (That Thing)", artist: "Lauryn Hill", year: 1998 },
    { title: "Coffee & TV", artist: "Blur", year: 1999 },
    { title: "I Want It That Way", artist: "Backstreet Boys", year: 1999 },
    { title: "Learn to Fly", artist: "Foo Fighters", year: 1999 },
    { title: "No Scrubs", artist: "TLC", year: 1999 },
    { title: "Scar Tissue", artist: "Red Hot Chili Peppers", year: 1999 },
    { title: "Beautiful Day", artist: "U2", year: 2000 },
    { title: "Hate to Say I Told You So", artist: "The Hives", year: 2000 },
    { title: "In the End", artist: "Linkin Park", year: 2000 },
    { title: "One More Time", artist: "Daft Punk", year: 2000 },
    { title: "Spinning Around", artist: "Kylie Minogue", year: 2000 },
    { title: "Chop Suey!", artist: "System of a Down", year: 2001 },
    { title: "Clint Eastwood", artist: "Gorillaz", year: 2001 },
    { title: "Fell in Love with a Girl", artist: "The White Stripes", year: 2001 },
    { title: "Hash Pipe", artist: "Weezer", year: 2001 },
    { title: "Murder on the Dancefloor", artist: "Sophie Ellis-Bextor", year: 2001 },
    { title: "Survivor", artist: "Destiny's Child", year: 2001 },
    { title: "Clocks", artist: "Coldplay", year: 2002 },
    { title: "Freak Like Me", artist: "Sugababes", year: 2002 },
    { title: "Rock Your Body", artist: "Justin Timberlake", year: 2002 },
    { title: "Sound of the Underground", artist: "Girls Aloud", year: 2002 },
    { title: "Without Me", artist: "Eminem", year: 2002 },
    { title: "Bring Me to Life", artist: "Evanescence", year: 2003 },
    { title: "Don't Look Back into the Sun", artist: "The Libertines", year: 2003 },
    { title: "Maps", artist: "Yeah Yeah Yeahs", year: 2003 },
    { title: "Run", artist: "Snow Patrol", year: 2003 },
    { title: "Toxic", artist: "Britney Spears", year: 2003 },
    { title: "American Idiot", artist: "Green Day", year: 2004 },
    { title: "Can't Stand Me Now", artist: "The Libertines", year: 2004 },
    { title: "Float On", artist: "Modest Mouse", year: 2004 },
    { title: "I Predict a Riot", artist: "Kaiser Chiefs", year: 2004 },
    { title: "Since U Been Gone", artist: "Kelly Clarkson", year: 2004 },
    { title: "Somebody Told Me", artist: "The Killers", year: 2004 },
    { title: "Somewhere Only We Know", artist: "Keane", year: 2004 },
    { title: "Take Me Out", artist: "Franz Ferdinand", year: 2004 },
    { title: "Dakota", artist: "Stereophonics", year: 2005 },
    { title: "Do You Want To", artist: "Franz Ferdinand", year: 2005 },
    { title: "Gold Digger", artist: "Kanye West", year: 2005 },
    { title: "Push the Button", artist: "Sugababes", year: 2005 },
    { title: "Back to Black", artist: "Amy Winehouse", year: 2006 },
    { title: "Crazy", artist: "Gnarls Barkley", year: 2006 },
    { title: "Naive", artist: "The Kooks", year: 2006 },
    { title: "Open Your Eyes", artist: "Snow Patrol", year: 2006 },
    { title: "Rehab", artist: "Amy Winehouse", year: 2006 },
    { title: "SexyBack", artist: "Justin Timberlake", year: 2006 },
    { title: "Smile", artist: "Lily Allen", year: 2006 },
    { title: "Starlight", artist: "Muse", year: 2006 },
    { title: "Supermassive Black Hole", artist: "Muse", year: 2006 },
    { title: "Valerie", artist: "The Zutons", year: 2006 },
    { title: "Welcome to the Black Parade", artist: "My Chemical Romance", year: 2006 },
    { title: "When You Were Young", artist: "The Killers", year: 2006 },
    { title: "Young Folks", artist: "Peter Bjorn and John", year: 2006 },
    { title: "Bleeding Love", artist: "Leona Lewis", year: 2007 },
    { title: "Electric Feel", artist: "MGMT", year: 2007 },
    { title: "Fluorescent Adolescent", artist: "Arctic Monkeys", year: 2007 },
    { title: "Misery Business", artist: "Paramore", year: 2007 },
    { title: "Paper Planes", artist: "M.I.A.", year: 2007 },
    { title: "Ruby", artist: "Kaiser Chiefs", year: 2007 },
    { title: "Stronger", artist: "Kanye West", year: 2007 },
    { title: "Tears Dry on Their Own", artist: "Amy Winehouse", year: 2007 },
    { title: "Umbrella", artist: "Rihanna", year: 2007 },
    { title: "Dog Days Are Over", artist: "Florence and the Machine", year: 2008 },
    { title: "Mercy", artist: "Duffy", year: 2008 },
    { title: "Poker Face", artist: "Lady Gaga", year: 2008 },
    { title: "The Fear", artist: "Lily Allen", year: 2008 },
    { title: "Use Somebody", artist: "Kings of Leon", year: 2008 },
    { title: "Viva la Vida", artist: "Coldplay", year: 2008 },
    { title: "Heads Will Roll", artist: "Yeah Yeah Yeahs", year: 2009 },
    { title: "Little Lion Man", artist: "Mumford & Sons", year: 2009 },
    { title: "Dancing On My Own", artist: "Robyn", year: 2010 },
    { title: "Pumped Up Kicks", artist: "Foster the People", year: 2010 },
    { title: "Sail", artist: "AWOLNATION", year: 2010 },
    { title: "Teenage Dream", artist: "Katy Perry", year: 2010 },
    { title: "Levels", artist: "Avicii", year: 2011 },
    { title: "Little Talks", artist: "Of Monsters and Men", year: 2011 },
    { title: "Midnight City", artist: "M83", year: 2011 },
    { title: "Shake It Out", artist: "Florence and the Machine", year: 2011 },
    { title: "Somebody That I Used to Know", artist: "Gotye", year: 2011 },
    { title: "Titanium", artist: "David Guetta", year: 2011 },
    { title: "Tongue Tied", artist: "Grouplove", year: 2011 },
    { title: "Video Games", artist: "Lana Del Rey", year: 2011 },
    { title: "Don't You Worry Child", artist: "Swedish House Mafia", year: 2012 },
    { title: "Euphoria", artist: "Loreen", year: 2012 },
    { title: "Feels Like We Only Go Backwards", artist: "Tame Impala", year: 2012 },
    { title: "Ho Hey", artist: "The Lumineers", year: 2012 },
    { title: "I Will Wait", artist: "Mumford & Sons", year: 2012 },
    { title: "Latch", artist: "Disclosure", year: 2012 },
    { title: "Radioactive", artist: "Imagine Dragons", year: 2012 },
    { title: "Summertime Sadness", artist: "Lana Del Rey", year: 2012 },
    { title: "Sweater Weather", artist: "The Neighbourhood", year: 2012 },
    { title: "Animals", artist: "Martin Garrix", year: 2013 },
    { title: "Do I Wanna Know?", artist: "Arctic Monkeys", year: 2013 },
    { title: "Get Lucky", artist: "Daft Punk", year: 2013 },
    { title: "Pompeii", artist: "Bastille", year: 2013 },
    { title: "Riptide", artist: "Vance Joy", year: 2013 },
    { title: "Roar", artist: "Katy Perry", year: 2013 },
    { title: "Take Me to Church", artist: "Hozier", year: 2013 },
    { title: "Wake Me Up", artist: "Avicii", year: 2013 },
    { title: "Wrecking Ball", artist: "Miley Cyrus", year: 2013 },
    { title: "Blank Space", artist: "Taylor Swift", year: 2014 },
    { title: "Chandelier", artist: "Sia", year: 2014 },
    { title: "Hold Back the River", artist: "James Bay", year: 2014 },
    { title: "Rather Be", artist: "Clean Bandit", year: 2014 },
    { title: "Shut Up and Dance", artist: "Walk the Moon", year: 2014 },
    { title: "Stay with Me", artist: "Sam Smith", year: 2014 },
    { title: "Thinking Out Loud", artist: "Ed Sheeran", year: 2014 },
    { title: "Can't Feel My Face", artist: "The Weeknd", year: 2015 },
    { title: "Hotline Bling", artist: "Drake", year: 2015 },
    { title: "Lean On", artist: "Major Lazer", year: 2015 },
    { title: "Stressed Out", artist: "Twenty One Pilots", year: 2015 },
    { title: "The Less I Know the Better", artist: "Tame Impala", year: 2015 },
    { title: "Ophelia", artist: "The Lumineers", year: 2016 },
    { title: "Redbone", artist: "Childish Gambino", year: 2016 },
    { title: "Believer", artist: "Imagine Dragons", year: 2017 },
    { title: "Feel It Still", artist: "Portugal. The Man", year: 2017 },
    { title: "Green Light", artist: "Lorde", year: 2017 },
    { title: "Havana", artist: "Camila Cabello", year: 2017 },
    { title: "HUMBLE.", artist: "Kendrick Lamar", year: 2017 },
    { title: "New Rules", artist: "Dua Lipa", year: 2017 },
    { title: "Sign of the Times", artist: "Harry Styles", year: 2017 },
    { title: "God's Plan", artist: "Drake", year: 2018 },
    { title: "Old Town Road", artist: "Lil Nas X", year: 2018 },
    { title: "Shotgun", artist: "George Ezra", year: 2018 },
    { title: "Someone You Loved", artist: "Lewis Capaldi", year: 2018 },
    { title: "Thank U, Next", artist: "Ariana Grande", year: 2018 },
    { title: "This Is America", artist: "Childish Gambino", year: 2018 },
    { title: "Borderline", artist: "Tame Impala", year: 2019 },
    { title: "Cornelia Street", artist: "Taylor Swift", year: 2019 },
    { title: "Dance Monkey", artist: "Tones and I", year: 2019 },
    { title: "Juice", artist: "Lizzo", year: 2019 },
    { title: "Say So", artist: "Doja Cat", year: 2019 },
    { title: "Dynamite", artist: "BTS", year: 2020 },
    { title: "Good Days", artist: "SZA", year: 2020 },
    { title: "Heat Waves", artist: "Glass Animals", year: 2020 },
    { title: "Levitating", artist: "Dua Lipa", year: 2020 },
    { title: "Midnight Sky", artist: "Miley Cyrus", year: 2020 },
    { title: "Pink Pony Club", artist: "Chappell Roan", year: 2020 },
    { title: "Positions", artist: "Ariana Grande", year: 2020 },
    { title: "Save Your Tears", artist: "The Weeknd", year: 2020 },
    { title: "Butter", artist: "BTS", year: 2021 },
    { title: "Deja Vu", artist: "Olivia Rodrigo", year: 2021 },
    { title: "Drivers License", artist: "Olivia Rodrigo", year: 2021 },
    { title: "Easy on Me", artist: "Adele", year: 2021 },
    { title: "Leave the Door Open", artist: "Silk Sonic", year: 2021 },
    { title: "Montero (Call Me by Your Name)", artist: "Lil Nas X", year: 2021 },
    { title: "Shivers", artist: "Ed Sheeran", year: 2021 },
    { title: "Wellerman", artist: "Nathan Evans", year: 2021 },
    { title: "Woman", artist: "Doja Cat", year: 2021 },
    { title: "About Damn Time", artist: "Lizzo", year: 2022 },
    { title: "Anti-Hero", artist: "Taylor Swift", year: 2022 },
    { title: "As It Was", artist: "Harry Styles", year: 2022 },
    { title: "Bad Habit", artist: "Steve Lacy", year: 2022 },
    { title: "Bones", artist: "Imagine Dragons", year: 2022 },
    { title: "Calm Down", artist: "Rema", year: 2022 },
    { title: "Escapism.", artist: "Raye", year: 2022 },
    { title: "Glimpse of Us", artist: "Joji", year: 2022 },
    { title: "I Ain't Worried", artist: "OneRepublic", year: 2022 },
    { title: "Kill Bill", artist: "SZA", year: 2022 },
    { title: "Late Night Talking", artist: "Harry Styles", year: 2022 },
    { title: "Snooze", artist: "SZA", year: 2022 },
    { title: "Space Man", artist: "Sam Ryder", year: 2022 },
    { title: "Stick Season", artist: "Noah Kahan", year: 2022 },
    { title: "Unholy", artist: "Sam Smith", year: 2022 },
    { title: "Daylight", artist: "David Kushner", year: 2023 },
    { title: "Feather", artist: "Sabrina Carpenter", year: 2023 },
    { title: "Flowers", artist: "Miley Cyrus", year: 2023 },
    { title: "Greedy", artist: "Tate McRae", year: 2023 },
    { title: "Hot to Go!", artist: "Chappell Roan", year: 2023 },
    { title: "Houdini", artist: "Dua Lipa", year: 2023 },
    { title: "Last Night", artist: "Morgan Wallen", year: 2023 },
    { title: "Lose Control", artist: "Teddy Swims", year: 2023 },
    { title: "Lovin On Me", artist: "Jack Harlow", year: 2023 },
    { title: "Padam Padam", artist: "Kylie Minogue", year: 2023 },
    { title: "Paint the Town Red", artist: "Doja Cat", year: 2023 },
    { title: "Tattoo", artist: "Loreen", year: 2023 },
    { title: "Vampire", artist: "Olivia Rodrigo", year: 2023 },
    { title: "Water", artist: "Tyla", year: 2023 },
    { title: "What Was I Made For?", artist: "Billie Eilish", year: 2023 },
    { title: "A Bar Song (Tipsy)", artist: "Shaboozey", year: 2024 },
    { title: "Beautiful Things", artist: "Benson Boone", year: 2024 },
    { title: "Birds of a Feather", artist: "Billie Eilish", year: 2024 },
    { title: "Die with a Smile", artist: "Lady Gaga", year: 2024 },
    { title: "Espresso", artist: "Sabrina Carpenter", year: 2024 },
    { title: "Good Luck, Babe!", artist: "Chappell Roan", year: 2024 },
    { title: "Messy", artist: "Lola Young", year: 2024 },
    { title: "Million Dollar Baby", artist: "Tommy Richman", year: 2024 },
    { title: "Not Like Us", artist: "Kendrick Lamar", year: 2024 },
    { title: "Please Please Please", artist: "Sabrina Carpenter", year: 2024 },
    { title: "Sailor Song", artist: "Gigi Perez", year: 2024 },
    { title: "Stargazing", artist: "Myles Smith", year: 2024 },
    { title: "Too Sweet", artist: "Hozier", year: 2024 },
    { title: "Yes, And?", artist: "Ariana Grande", year: 2024 },
    { title: "Ordinary", artist: "Alex Warren", year: 2025 }
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\bthe\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function idOf(s) {
    return s.id || (norm(s.title) + '|' + norm(s.artist));
  }

  function lettersOf(s) {
    return new Set(String(s || '').toUpperCase().replace(/[^A-Z]/g, '').split(''));
  }

  function allLetters(title, artist) {
    const set = new Set();
    lettersOf(title).forEach(function (ch) { set.add(ch); });
    lettersOf(artist).forEach(function (ch) { set.add(ch); });
    return set;
  }

  function emptyState() {
    return {
      phase: 'idle',
      roundId: 0,
      puzzleId: null,
      title: '',
      artist: '',
      year: null,
      yearHint: null,
      revealed: [],
      wrong: [],
      lives: LIVES,
      livesLeft: LIVES,
      winner: null,
      recent: [],
      leaderboard: [],
      usedIds: [],
      customSongs: [],
      lastAcceptedAt: 0,
      userCooldown: {},
      startedAt: 0
    };
  }

  function catalog(state) {
    return SONGS.concat((state && state.customSongs) || []);
  }

  const ARTIST_GAP = 15; // an artist can't come back until 15 other puzzles have gone by

  function decadeOf(s) {
    return s && s.year ? Math.floor(s.year / 10) * 10 : null;
  }

  function artistKeyOfId(id) {
    const i = String(id || '').lastIndexOf('|');
    return i >= 0 ? String(id).slice(i + 1) : '';
  }

  function pickPuzzle(state, forced) {
    if (forced) return forced;
    const all = catalog(state);
    const used = new Set(state.usedIds || []);
    let pool = all.filter(function (s) { return !used.has(idOf(s)); });
    if (!pool.length) {
      const last = (state.usedIds || [])[(state.usedIds || []).length - 1];
      pool = all.filter(function (s) { return idOf(s) !== last; });
      if (!pool.length) pool = all.slice();
      state.usedIds = last ? [last] : [];
    }
    // Mixing: skip artists from the last ARTIST_GAP puzzles (ids end in "|artist"), and the
    // previous puzzle's decade. History is kept across a list reset. Falls back if too strict.
    const history = (state.recentPicks || state.usedIds || []).slice(-ARTIST_GAP);
    const recentArtists = new Set(history.map(artistKeyOfId).filter(Boolean));
    const lastDecade = state.year ? Math.floor(state.year / 10) * 10 : null;
    const noArtist = pool.filter(function (s) { return !recentArtists.has(norm(s.artist)); });
    const best = noArtist.filter(function (s) { return lastDecade === null || decadeOf(s) !== lastDecade; });
    const choice = best.length ? best : (noArtist.length ? noArtist : pool);
    return choice[Math.floor(Math.random() * choice.length)];
  }


  function isComplete(state) {
    const need = allLetters(state.title, state.artist);
    if (!need.size) return false;
    return Array.from(need).every(function (ch) { return state.revealed.indexOf(ch) >= 0; });
  }

  function award(state, name) {
    const n = String(name || 'Viewer').trim() || 'Viewer';
    const lb = (state.leaderboard || []).map(function (x) { return { name: x.name, solves: x.solves }; });
    const i = lb.findIndex(function (x) { return x.name.toLowerCase() === n.toLowerCase(); });
    if (i >= 0) lb[i].solves += 1;
    else lb.push({ name: n, solves: 1 });
    lb.sort(function (a, b) { return b.solves - a.solves || a.name.localeCompare(b.name); });
    return lb;
  }

  function pushRecent(state, name, guess, ok, kind, now) {
    const row = { name: String(name || 'Viewer').trim() || 'Viewer', guess: String(guess || ''), ok: !!ok, kind: kind || 'letter', t: now || Date.now() };
    state.recent = [row].concat(state.recent || []).slice(0, 12);
    return state;
  }

  function clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function startNext(state, opts) {
    const s = clone(state);
    const p = pickPuzzle(s, opts && opts.puzzle);
    const id = idOf(p);
    const usedIds = (s.usedIds || []).filter(function (x, i, a) {
      // If the pool was exhausted, pickPuzzle may have reset usedIds already.
      return true;
    }).concat([id]);
    return {
      phase: 'playing',
      roundId: (s.roundId || 0) + 1,
      puzzleId: id,
      title: p.title,
      artist: p.artist || '',
      year: p.year || null,
      yearHint: null,
      revealed: [],
      wrong: [],
      lives: LIVES,
      livesLeft: LIVES,
      winner: null,
      recent: [],
      leaderboard: s.leaderboard || [],
      usedIds: usedIds,
      recentPicks: (s.recentPicks || s.usedIds || []).concat([id]).slice(-30),
      customSongs: s.customSongs || [],
      lastAcceptedAt: 0,
      userCooldown: {},
      startedAt: Date.now()
    };
  }

  function cooldownOk(state, name, now, host) {
    if (host) return true;
    const key = String(name || '').trim().toLowerCase();
    if (!key) return true;
    const until = (state.userCooldown || {})[key] || 0;
    return now >= until;
  }

  function markCooldown(state, name, now) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return;
    state.userCooldown = state.userCooldown || {};
    state.userCooldown[key] = now + USER_COOLDOWN_MS;
  }

  function guessLetter(state, letter, name, now, opts) {
    const s = clone(state);
    const host = !!(opts && opts.host);
    const ch = String(letter || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
    now = now || Date.now();
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (!ch) return { ok: false, reason: 'not-a-letter', state: s };
    if (s.revealed.indexOf(ch) >= 0 || s.wrong.indexOf(ch) >= 0) {
      return { ok: true, accepted: false, reason: 'already', letter: ch, state: s };
    }
    if (!host && !cooldownOk(s, name, now, false)) {
      return { ok: true, accepted: false, reason: 'cooldown', letter: ch, state: s };
    }
    if (!host && s.lastAcceptedAt && now - s.lastAcceptedAt < LETTER_THROTTLE_MS) {
      return { ok: true, accepted: false, reason: 'throttle', letter: ch, state: s, retry: true };
    }
    const need = allLetters(s.title, s.artist);
    const correct = need.has(ch);
    s.lastAcceptedAt = now;
    markCooldown(s, name, now);
    if (correct) {
      s.revealed = s.revealed.concat([ch]);
      pushRecent(s, name, ch, true, 'letter', now);
      if (isComplete(s)) {
        s.phase = 'won';
        s.winner = { name: String(name || 'Viewer').trim() || 'Viewer', how: 'letters' };
        s.leaderboard = award(s, name);
      }
      return { ok: true, accepted: true, correct: true, letter: ch, win: s.phase === 'won', state: s };
    }
    s.wrong = s.wrong.concat([ch]);
    s.livesLeft = Math.max(0, (s.livesLeft || LIVES) - 1);
    pushRecent(s, name, ch, false, 'letter', now);
    if (s.livesLeft <= 0) {
      s.phase = 'lost';
      s.revealed = Array.from(need);
      s.winner = null;
    }
    return { ok: true, accepted: true, correct: false, letter: ch, lost: s.phase === 'lost', state: s };
  }

  function matchesAnswer(state, text) {
    const t = norm(text);
    if (!t) return false;
    const title = norm(state.title);
    if (!title) return false;
    if (t === title) return true;
    const variants = [
      state.title + ' ' + state.artist,
      state.title + ' by ' + state.artist,
      state.title + ' - ' + state.artist,
      state.artist + ' ' + state.title,
      state.artist + ' - ' + state.title
    ];
    return variants.some(function (v) { return norm(v) === t; });
  }

  function trySolve(state, text, name, now, opts) {
    const s = clone(state);
    const host = !!(opts && opts.host);
    now = now || Date.now();
    const raw = String(text || '').trim();
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (norm(raw).length < 2) return { ok: false, reason: 'short', state: s };
    if (!host && !cooldownOk(s, name, now, false)) {
      return { ok: true, accepted: false, reason: 'cooldown', state: s };
    }
    if (!host && s.lastAcceptedAt && now - s.lastAcceptedAt < LETTER_THROTTLE_MS) {
      return { ok: true, accepted: false, reason: 'throttle', state: s, retry: true };
    }
    const hit = matchesAnswer(s, raw);
    s.lastAcceptedAt = now;
    markCooldown(s, name, now);
    if (!hit) {
      pushRecent(s, name, raw, false, 'solve', now);
      return { ok: true, accepted: true, correct: false, reason: 'wrong-solve', state: s };
    }
    s.revealed = Array.from(allLetters(s.title, s.artist));
    s.phase = 'won';
    s.winner = { name: String(name || 'Viewer').trim() || 'Viewer', how: 'solve' };
    s.leaderboard = award(s, name);
    pushRecent(s, name, raw, true, 'solve', now);
    return { ok: true, accepted: true, correct: true, win: true, state: s };
  }

  function handleChat(state, name, text, now, opts) {
    const raw = String(text || '').trim();
    const compact = raw.replace(/[^a-zA-Z]/g, '');
    // A single letter, maybe wrapped in punctuation or emoji, counts as a letter guess.
    if (compact.length === 1 && raw.length <= 6) {
      return guessLetter(state, compact, name, now, opts);
    }
    return trySolve(state, raw, name, now, opts);
  }

  function revealLetter(state) {
    const s = clone(state);
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    const hidden = Array.from(allLetters(s.title, s.artist)).filter(function (ch) {
      return s.revealed.indexOf(ch) < 0;
    });
    if (!hidden.length) return { ok: false, reason: 'none-left', state: s };
    const ch = hidden[Math.floor(Math.random() * hidden.length)];
    s.revealed = s.revealed.concat([ch]);
    s.lastAcceptedAt = Date.now();
    pushRecent(s, 'Grumpy', ch, true, 'hint', Date.now());
    if (isComplete(s)) {
      s.phase = 'revealed';
      s.winner = null;
    }
    return { ok: true, accepted: true, correct: true, letter: ch, host: true, state: s };
  }

  function revealAnswer(state) {
    const s = clone(state);
    if (s.phase !== 'playing' && s.phase !== 'idle') {
      if (s.title) {
        s.revealed = Array.from(allLetters(s.title, s.artist));
        if (s.phase === 'playing') s.phase = 'revealed';
      }
      return { ok: true, state: s };
    }
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    s.revealed = Array.from(allLetters(s.title, s.artist));
    s.phase = 'revealed';
    s.winner = null;
    return { ok: true, state: s };
  }

  // Main hint: first press shows the decade, a second press the exact year.
  function hintYear(state) {
    const s = clone(state);
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (!s.year) return { ok: false, reason: 'no-year-for-this-song', state: s };
    if (s.yearHint === 'year') return { ok: false, reason: 'year-already-shown', state: s };
    s.yearHint = s.yearHint === 'decade' ? 'year' : 'decade';
    pushRecent(s, 'Grumpy', s.yearHint === 'year' ? 'Year hint' : 'Decade hint', true, 'hint', Date.now());
    return { ok: true, state: s };
  }

  // Decade/year hint text on screen, e.g. "1970s" or "1977" (the band is on the board as blanks).
  function hintText(state) {
    const st = state || {}, parts = [];
    const done = st.phase === 'won' || st.phase === 'lost' || st.phase === 'revealed';
    if (st.year && (done || st.yearHint === 'year')) parts.push(String(st.year));
    else if (st.year && st.yearHint === 'decade') parts.push((Math.floor(st.year / 10) * 10) + 's');
    return parts.join(' · ');
  }

  function skip(state, opts) {
    return { ok: true, state: startNext(state, opts) };
  }

  function addSong(state, title, artist, play, year) {
    const s = clone(state);
    const t = String(title || '').trim();
    const a = String(artist || '').trim();
    if (!t || !/[a-z]/i.test(t)) return { ok: false, reason: 'need-song-title', state: s };
    const y = parseInt(year, 10);
    const song = { title: t, artist: a, year: (y >= 1900 && y <= 2100) ? y : null, id: 'custom-' + Date.now() };
    s.customSongs = (s.customSongs || []).concat([song]);
    if (play) return { ok: true, added: song, state: startNext(s, { puzzle: song }) };
    return { ok: true, added: song, state: s };
  }

  function applyAction(state, action, now) {
    const type = action && action.type;
    if (type === 'next') return { ok: true, state: startNext(state, action) };
    if (type === 'skip') return skip(state, action);
    if (type === 'reveal-letter') return revealLetter(state);
    if (type === 'reveal-answer') return revealAnswer(state);
    if (type === 'hint-year') return hintYear(state);
    if (type === 'add-song') return addSong(state, action.title, action.artist, !!action.play, action.year);
    if (type === 'guess') return guessLetter(state, action.letter, action.name, now, action);
    if (type === 'solve' || type === 'chat') {
      return handleChat(state, action.name, action.text || action.guess, now, action);
    }
    if (type === 'reset-board') {
      const s = emptyState();
      s.customSongs = (state && state.customSongs) || [];
      return { ok: true, state: s };
    }
    return { ok: false, reason: 'unknown', state: state };
  }

  function tokens(line) {
    // Split a title/artist into words of characters, keeping punctuation visible.
    const words = [];
    String(line || '').split(/\s+/).forEach(function (w) {
      if (!w) return;
      const chars = [];
      for (let i = 0; i < w.length; i++) {
        const c = w[i];
        const up = c.toUpperCase();
        if (/[A-Za-z]/.test(c)) chars.push({ kind: 'letter', ch: up, raw: c });
        else chars.push({ kind: 'punct', ch: c, raw: c });
      }
      words.push(chars);
    });
    return words;
  }

  function chatName(d) {
    return (d && (d.nickname || d.uniqueId || d.name || d.user || d.display || d.username || d.unique_id)) || 'Viewer';
  }

  function chatText(d) {
    if (!d) return '';
    return d.comment || d.text || d.msg || d.message || d.content || d.chat || '';
  }

  function isChatEvent(d) {
    if (!d || !d.type) return false;
    return d.type === 'chat' || d.type === 'comment' || d.type === 'message' || d.type === 'tiktok-chat';
  }

  root.OasisHangman = {
    LIVES: LIVES,
    LETTER_THROTTLE_MS: LETTER_THROTTLE_MS,
    USER_COOLDOWN_MS: USER_COOLDOWN_MS,
    CHANNEL: CHANNEL,
    STORE: STORE,
    SONGS: SONGS,
    norm: norm,
    idOf: idOf,
    allLetters: allLetters,
    emptyState: emptyState,
    catalog: catalog,
    isComplete: isComplete,
    startNext: startNext,
    guessLetter: guessLetter,
    trySolve: trySolve,
    handleChat: handleChat,
    matchesAnswer: matchesAnswer,
    revealLetter: revealLetter,
    revealAnswer: revealAnswer,
    skip: skip,
    hintYear: hintYear,
    hintText: hintText,
    addSong: addSong,
    applyAction: applyAction,
    tokens: tokens,
    chatName: chatName,
    chatText: chatText,
    isChatEvent: isChatEvent
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.OasisHangman;
})(typeof window !== 'undefined' ? window : globalThis);
