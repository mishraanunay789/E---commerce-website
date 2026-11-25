const $ = id => document.getElementById(id);
let products = [], cart = JSON.parse(localStorage.getItem("shopease-cart") || "[]"), activeCategory = "All";
let toastTimer;
const money = n => "₹" + Number(n).toLocaleString("en-IN");
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url, options={}) {
  const response = await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
function toast(message){$("toast").textContent=message;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2400);}
async function loadProducts(){
  products=await api("/api/products");
  renderCategories(); renderProducts(); renderCartCount();
}
function renderCategories(){
  const cats=["All",...new Set(products.map(p=>p.category))];
  $("categories").innerHTML=cats.map(c=>`<button class="category-btn ${activeCategory===c?"active":""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
}
function renderProducts(){
  const q=$("search").value.toLowerCase();
  const shown=products.filter(p=>(activeCategory==="All"||p.category===activeCategory)&&(`${p.name} ${p.description}`.toLowerCase().includes(q)));
  $("product-count").textContent=`${shown.length} products`;
  $("product-grid").innerHTML=shown.map(p=>`
    <article class="product-card"><div class="product-image"><img src="${escapeHTML(p.image||"")}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.display='none'"></div>
    <div class="product-category">${escapeHTML(p.category)}</div><h3>${escapeHTML(p.name)}</h3>
    <div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-btn" data-add="${p._id}" ${p.stock<1?"disabled":""}>${p.stock<1?"Sold out":"＋ Add"}</button></div></article>`).join("") || '<p class="muted">No products match your search.</p>';
}
function saveCart(){localStorage.setItem("shopease-cart",JSON.stringify(cart));renderCartCount();renderCart();}
function renderCartCount(){$("cart-count").textContent=cart.reduce((n,i)=>n+i.quantity,0);}
function renderCart(){
  $("cart-items").innerHTML=cart.map(item=>{const p=products.find(x=>x._id===item.productId);if(!p)return "";
    return `<div class="cart-line"><img src="${escapeHTML(p.image)}" alt=""><div><strong>${escapeHTML(p.name)}</strong><small>${money(p.price)} each</small></div><div class="qty-controls"><button data-qty="-1" data-id="${p._id}">−</button><span>${item.quantity}</span><button data-qty="1" data-id="${p._id}">+</button><button data-remove="${p._id}" title="Remove">×</button></div></div>`;
  }).join("") || '<p class="muted">Your bag is empty. Add something you like.</p>';
  const total=cart.reduce((sum,item)=>{const p=products.find(x=>x._id===item.productId);return sum+(p?p.price*item.quantity:0)},0);
  $("cart-total").textContent=money(total);
  $("checkout-open").disabled=!cart.length;
}
function addToCart(id){
  const product=products.find(p=>p._id===id);if(!product)return;
  const existing=cart.find(i=>i.productId===id);
  if(existing){if(existing.quantity>=product.stock)return toast("No more stock available");existing.quantity++;}
  else cart.push({productId:id,quantity:1});
  saveCart();toast("Added to your bag");
}
$("product-grid").addEventListener("click",e=>{if(e.target.dataset.add)addToCart(e.target.dataset.add)});
$("categories").addEventListener("click",e=>{if(e.target.dataset.category){activeCategory=e.target.dataset.category;renderCategories();renderProducts();}});
$("search").addEventListener("input",renderProducts);
$("cart-open").addEventListener("click",()=>{$("cart-dialog").showModal();renderCart();});
$("cart-items").addEventListener("click",e=>{
  const id=e.target.dataset.id;if(!id)return;
  const item=cart.find(i=>i.productId===id);if(!item)return;
  if(e.target.dataset.qty){item.quantity+=Number(e.target.dataset.qty);if(item.quantity<1)cart=cart.filter(i=>i.productId!==id);else {const p=products.find(x=>x._id===id);if(p&&item.quantity>p.stock){item.quantity=p.stock;toast("Stock limit reached");}}}
  if(e.target.dataset.remove)cart=cart.filter(i=>i.productId!==id);
  saveCart();
});
$("checkout-open").addEventListener("click",()=>{if(!cart.length)return;$("cart-dialog").close();$("checkout-dialog").showModal();});
$("checkout-form").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const result=await api("/api/orders",{method:"POST",body:JSON.stringify({
      customer:{name:$("customer-name").value,email:$("customer-email").value,address:$("customer-address").value},
      items:cart.map(i=>({productId:i.productId,quantity:i.quantity}))
    })});
    cart=[];saveCart();$("checkout-dialog").close();$("checkout-form").reset();
    $("order-result").innerHTML=`<div class="lookup-result"><strong>Order placed!</strong><br>Your order ID: <code>${escapeHTML(result.order._id)}</code><br>Total: ${money(result.order.total)}<br>Status: ${escapeHTML(result.order.status)}</div>`;
    $("lookup-id").value=result.order._id;$("orders").scrollIntoView({behavior:"smooth"});await loadProducts();toast("Order placed successfully");
  }catch(err){toast(err.message);}
});
$("order-lookup").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const o=await api(`/api/orders/${encodeURIComponent($("lookup-id").value.trim())}`);
    $("order-result").innerHTML=`<div class="lookup-result"><strong>Order ${escapeHTML(o._id)}</strong><br>Customer: ${escapeHTML(o.customer.name)}<br>Total: ${money(o.total)}<br>Status: <b>${escapeHTML(o.status)}</b><br>Items: ${o.items.map(i=>`${escapeHTML(i.name)} × ${i.quantity}`).join(", ")}</div>`;
  }catch(err){$("order-result").innerHTML=`<div class="lookup-result">${escapeHTML(err.message)}</div>`;}
});

document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
$("admin-toggle").addEventListener("click",async()=>{
  $("admin").classList.toggle("hidden");
  if(!$("admin").classList.contains("hidden")){ $("admin").scrollIntoView({behavior:"smooth"});await loadAdmin();}
});
$("admin-refresh").addEventListener("click",loadAdmin);
async function loadAdmin(){
  try{
    const [summary,orders]=await Promise.all([api("/api/summary"),api("/api/orders")]);
    $("sum-products").textContent=summary.products;$("sum-orders").textContent=summary.orders;$("sum-revenue").textContent=money(summary.revenue);
    $("admin-products").innerHTML=products.map(p=>`<div class="admin-row"><span><b>${escapeHTML(p.name)}</b><br>${money(p.price)} · Stock ${p.stock}</span><span><button data-edit="${p._id}">Edit</button> <button data-delete="${p._id}">Delete</button></span></div>`).join("")||'<p class="muted">No products.</p>';
    $("admin-orders").innerHTML=orders.map(o=>`<div class="admin-row"><span><b>${escapeHTML(o.customer.name)}</b><br>${money(o.total)} · ${new Date(o.createdAt).toLocaleDateString()}</span><select data-order-status="${o._id}">${["Placed","Processing","Shipped","Delivered","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")||'<p class="muted">No orders yet.</p>';
  }catch(err){toast(err.message);}
}
$("product-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("edit-product-id").value;
  const body={name:$("p-name").value,category:$("p-category").value,price:Number($("p-price").value),stock:Number($("p-stock").value),image:$("p-image").value,description:$("p-description").value};
  try{await api(id?`/api/products/${id}`:"/api/products",{method:id?"PUT":"POST",body:JSON.stringify(body)});
    $("product-form").reset();$("edit-product-id").value="";$("p-stock").value=10;$("product-form-title").textContent="Add a product";
    await loadProducts();await loadAdmin();toast(id?"Product updated":"Product added");
  }catch(err){toast(err.message);}
});
$("admin-products").addEventListener("click",async e=>{
  try{
    const id=e.target.dataset.edit;
    if(id){const p=products.find(x=>x._id===id);$("edit-product-id").value=id;$("p-name").value=p.name;$("p-category").value=p.category;$("p-price").value=p.price;$("p-stock").value=p.stock;$("p-image").value=p.image;$("p-description").value=p.description;$("product-form-title").textContent="Edit product";$("p-name").focus();}
    if(e.target.dataset.delete&&confirm("Delete this product?")){await api(`/api/products/${e.target.dataset.delete}`,{method:"DELETE"});await loadProducts();await loadAdmin();toast("Product deleted");}
  }catch(err){toast(err.message);}
});
$("admin-orders").addEventListener("change",async e=>{
  const id=e.target.dataset.orderStatus;if(!id)return;
  try{await api(`/api/orders/${id}/status`,{method:"PATCH",body:JSON.stringify({status:e.target.value})});toast("Order status updated");}
  catch(err){toast(err.message);}
});
loadProducts().catch(err=>toast(err.message));