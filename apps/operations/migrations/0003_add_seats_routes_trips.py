# Generated for operations domain expansion (Sprint 1)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('operations', '0002_bus'),
    ]

    operations = [
        migrations.AddField(
            model_name='bus',
            name='last_maintenance_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bus',
            name='insurance_expiry',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='bus',
            constraint=models.CheckConstraint(
                condition=models.Q(seat_capacity__gt=0),
                name='chk_buses_capacity',
            ),
        ),
        migrations.CreateModel(
            name='BusSeat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('seat_number', models.CharField(max_length=10)),
                ('seat_type', models.CharField(choices=[('STANDARD', 'Standard'), ('VIP', 'VIP')], default='STANDARD', max_length=20)),
                ('floor_number', models.PositiveSmallIntegerField(default=1)),
                ('seat_row', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('column_number', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seats', to='operations.bus')),
            ],
            options={
                'db_table': 'bus_seats',
                'indexes': [models.Index(fields=['bus', 'is_active'], name='idx_bus_seats_bus_active')],
                'constraints': [
                    models.UniqueConstraint(fields=('bus', 'seat_number'), name='uq_bus_seat_number'),
                    models.CheckConstraint(condition=models.Q(floor_number__gte=1), name='chk_bus_seats_floor'),
                ],
            },
        ),
        migrations.CreateModel(
            name='Route',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('route_code', models.CharField(max_length=20, unique=True)),
                ('route_name', models.CharField(max_length=160)),
                ('distance_km', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('estimated_duration_minutes', models.PositiveIntegerField(blank=True, null=True)),
                ('base_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('INACTIVE', 'Inactive')], default='ACTIVE', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('destination_station', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='destination_routes', to='operations.station')),
                ('origin_station', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='origin_routes', to='operations.station')),
            ],
            options={
                'db_table': 'routes',
                'indexes': [models.Index(fields=['origin_station', 'destination_station', 'status'], name='idx_routes_origin_dest')],
                'constraints': [
                    models.CheckConstraint(condition=models.Q(origin_station=models.F('destination_station'), _negated=True), name='chk_routes_different_stations'),
                    models.CheckConstraint(condition=models.Q(base_price__gte=0), name='chk_routes_base_price'),
                ],
            },
        ),
        migrations.CreateModel(
            name='Trip',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('trip_code', models.CharField(max_length=30, unique=True)),
                ('departure_time', models.DateTimeField()),
                ('arrival_time', models.DateTimeField()),
                ('ticket_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('OPEN_FOR_BOOKING', 'Open for booking'), ('BOARDING', 'Boarding'), ('DEPARTED', 'Departed'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='OPEN_FOR_BOOKING', max_length=30)),
                ('notes', models.CharField(blank=True, max_length=500, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bus', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.RESTRICT, related_name='trips', to='operations.bus')),
                ('route', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='trips', to='operations.route')),
            ],
            options={
                'db_table': 'trips',
                'indexes': [
                    models.Index(fields=['route', 'departure_time', 'status'], name='idx_trips_search'),
                    models.Index(fields=['bus', 'departure_time', 'arrival_time', 'status'], name='idx_trips_bus_sched'),
                ],
                'constraints': [
                    models.CheckConstraint(condition=models.Q(arrival_time__gt=models.F('departure_time')), name='chk_trips_time'),
                    models.CheckConstraint(condition=models.Q(ticket_price__gte=0), name='chk_trips_price'),
                ],
            },
        ),
        migrations.CreateModel(
            name='TripStaffAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assignment_role', models.CharField(choices=[('DRIVER', 'Driver'), ('BUS_ATTENDANT', 'Bus Attendant')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='trip_assignments', to='accounts.employee')),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='staff_assignments', to='operations.trip')),
            ],
            options={
                'db_table': 'trip_staff_assignments',
                'indexes': [models.Index(fields=['employee', 'trip'], name='idx_trip_staff_employee')],
                'constraints': [
                    models.UniqueConstraint(fields=('trip', 'employee'), name='uq_trip_employee'),
                ],
            },
        ),
    ]
