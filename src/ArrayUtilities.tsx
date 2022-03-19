function contains<T>(arr: T[], obj: T) : boolean {
    return arr.indexOf(obj) > -1;
}

function remove<T>(arr: T[], obj: T): void {
    //console.log("index: " + arr.indexOf(obj));
    //console.log(arr);
    //console.log(obj);
    arr.splice(arr.indexOf(obj), 1);
}

export {
    contains, remove
}