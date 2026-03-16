<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('kitchen.orders', function ($user) {
    return $user->hasAnyRole(['admin', 'kitchen']);
});

Broadcast::channel('cashier.orders', function ($user) {
    return $user->hasAnyRole(['admin', 'cashier']);
});

Broadcast::channel('table.{tableId}', function ($user, $tableId) {
    return $user->hasRole('admin')
        || $user->hasRole('cashier')
        || $user->hasRole('kitchen')
        || $user->hasRole('waiter');
});
