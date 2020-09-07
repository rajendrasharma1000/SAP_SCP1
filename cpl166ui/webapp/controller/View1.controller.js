/*global location history */
sap.ui.define([
	"com/sap/aldi/cr221-qm-external-record-inspection/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/sap/aldi/cr221-qm-external-record-inspection/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"com/sap/aldi/cr221-qm-external-record-inspection/model/PersoService",
	"sap/m/TablePersoController",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Sorter, PersoService, TablePersoController, Spreadsheet, MessageToast) {
	"use strict";
	var oBundle;
	return BaseController.extend("com.sap.aldi.cr221-qm-external-record-inspection.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("InspectionLotTable"),
				Today = new Date(),
				Today10 = new Date();
				Today10 = new Date(Today10.setDate(Today10.getDate() + 10));
				var oDateModel = new JSONModel({today: Today, today10: Today10});
            	this.setModel(oDateModel,"deadline");
            	oBundle = this.getResourceBundle();
			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];


			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});

			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			var oModel = this.getOwnerComponent().getModel("appState");

			this._oRouter = this.getOwnerComponent().getRouter();
			this.oInitData = {
				iTotalItems:0,
				UserSelection: {
					PlantValueHelp: {
						Plant: '',
						PlantKey: ''
					},
					CommodityGrpValueHelp: {
						CommodityGrp: '',
						CommodityGrpKey: ''
					},
					MaterialValueHelp: {
						Material: '',
						MaterialKey: ''
					},
					VendorValueHelp: {
						Vendor: '',
						VendorKey: ''
					},
					ValidityStartDate: {
						ValidityStartDateValue: null,
						ValidityStartDateSecondValue: null,
						ValidityStartDateState: 'None'
					},
					DeadlineDate: {
						DeadlineDateValue: null,
						DeadlineDateSecondValue: null,
						DeadlineDateState: 'None'
					},
					InsctionLotNo: {
						InsctionLotNoValue: ""	
					},
					TestLabId: {
						TestLabIdValue: "",
						TestLabIdState: 'None'
					},
					Status: {
						StatusValue: "",
						StatusState: 'None'
					},
					InspectionType: {
						InspectionTypeValue: "",
						InspectionTypeState: 'None'
					},
					detailScreen:[
						{
							Characteristic: "CHEM",
							attachments:[]
						},
						{
							Characteristic: "ELECT",
							attachments:[]
						}]
				}
			};
			oModel.setData(this.oInitData);
			this.mGroupFunctions = {
				MaterialDesc: function(oContext) {
					var name = oContext.getProperty("MaterialDesc");
					return {
						key: name,
						text: name
					};
				},
				Status: function(oContext) {
					var name = oContext.getProperty("Status");
					if(name === "I0202"){
						return {
							key: name,
							text: "Created"
						};
					}else if(name === "I0207"){
						return {
							key: name,
							text: "Open"
						};
					}else if(name === "E0002"){
						return {
							key: name,
							text: "Closed"
						};
					}else {
						return {
							key: name,
							text: name
						};
					}
				},
				PlantDesc: function(oContext) {
					var name = oContext.getProperty("PlantDesc");
					return {
						key: name,
						text: name
					};
				},
				InspectionTypeDesc: function(oContext) {
					var name = oContext.getProperty("InspectionTypeDesc");
					return {
						key: name,
						text: name
					};
				},
				InspectionLotNR: function(oContext) {
					var name = oContext.getProperty("InspectionLotNR");
					return {
						key: name,
						text: name
					};
				},
				TestLabID: function(oContext) {
					var name = oContext.getProperty("TestLabID");
					return {
						key: name,
						text: name
					};
				},
				CommodityGroupDesc: function(oContext) {
					var name = oContext.getProperty("CommodityGroupDesc");
					return {
						key: name,
						text: name
					};
				},
				VendorDesc: function(oContext) {
					var name = oContext.getProperty("VendorDesc");
					return {
						key: name,
						text: name
					};
				},
				EarliestSaleDate: function(oContext) {
					var name = oContext.getProperty("EarliestSaleDate");
					return {
						key: name,
						text: name.toLocaleDateString(("de-DE"))
					};
				},
				Deadline: function(oContext) {
					var name = oContext.getProperty("Deadline");
					return {
						key: name,
						text: name.toLocaleDateString(("de-DE"))
					};
				}
			};
			
			// init and activate controller
			this._oTPC = new TablePersoController({
				table: this.byId("InspectionLotTable"),
				persoService: PersoService
			}).activate();
		},
		
		onExit: function(){
			this._oTPC.getAggregation("_tablePersoDialog").destroy();
			this._oTPC.destroyPersoService();
		},
		
		onClearButtonPress: function () {
			var oModel = this.getView().getModel("appState");
			var oTable = this.byId("InspectionLotTable");
			var oInitData = {
				iTotalItems:0,
				UserSelection: {
					PlantValueHelp: {
						Plant: '',
						PlantKey: ''
					},
					CommodityGrpValueHelp: {
						CommodityGrp: '',
						CommodityGrpKey: ''
					},
					MaterialValueHelp: {
						Material: '',
						MaterialKey: ''
					},
					VendorValueHelp: {
						Vendor: '',
						VendorKey: ''
					},
					ValidityStartDate: {
						ValidityStartDateeValue: null,
						ValidityStartDateSecondValue: null,
						ValidityStartDateState: 'None'
					},
					DeadlineDate: {
						DeadlineDateValue: null,
						DeadlineDateSecondValue: null,
						DeadlineDateState: 'None'
					},
					InsctionLotNo: {
						InsctionLotNoValue: ""	
					},
					TestLabId: {
						TestLabIdValue: "",
						TestLabIdState: 'None'
					},
					Status: {
						StatusValue: "",
						StatusState: 'None'
					},
					InspectionType: {
						InspectionTypeValue: "",
						InspectionTypeState: 'None'
					}
				}
			}; 
			oModel.setData(oInitData);
		},
		
		onPersoButtonPressed: function (oEvent) {
			this._oTPC.openDialog();
		},

		onTablePersoRefresh : function() {
			DemoPersoService.resetPersData();
			this._oTPC.refresh();
		},
		
		createColumnConfig: function() {
			var aCols = [];
			aCols.push({
				label: oBundle.getText("colInsctionLotNo"),
				type: 'number',
				property: 'InspectionLotNR',
				scale: 0
			});

			aCols.push({
				property: 'TestLabID',
				label: oBundle.getText("colTestLabId"),
				type: 'string'
			});

			aCols.push({
				property: 'MaterialDesc',
				label: oBundle.getText("colMaterial"),
				type: 'string'
			});

			aCols.push({
				property: 'CommodityGroupDesc',
				label: oBundle.getText("colCommodityGroup"),
				type: 'string'
			});

			aCols.push({
				property: 'VendorDesc',
				label: oBundle.getText("colVendor"),
				type: 'string'
			});

			aCols.push({
				property: 'PlantDesc',
				label: oBundle.getText("colPlant"),
				type: 'string'
			});
			aCols.push({
				property: 'InspectionTypeDesc',
				label: oBundle.getText("colInspectionType"),
				type: 'string'
			});
			aCols.push({
				property: 'EarliestSaleDate',
				label: oBundle.getText("colValidityStartDate"),
				type: 'date'
			});
			aCols.push({
				property: 'Deadline',
				label: oBundle.getText("colDeadline"),
				type: 'date'
			});

			aCols.push({
				property: formatter.StatusIdToText('Status'),
				
				label: oBundle.getText("colStatus"),
				type: 'string'
			});

			return aCols;
		},
		
		onExportButtonPressed: function() {
			var aCols, oRowBinding, oSettings, oSheet, oTable;
			var that = this;
			if (!this._oTable) {
				this._oTable = this.byId('InspectionLotTable');
			}

			oTable = this._oTable;
			oRowBinding = oTable.getBinding("items");
			if(oRowBinding === undefined){
				MessageToast.show("Filter Inspection Lot table to export !");
				return;
			}
			var aFilter = oRowBinding.aFilters;
			var aSorters = oRowBinding.aSorters;
			aCols = this.createColumnConfig();

			var oModel = oRowBinding.getModel();
			var aJsonData = [];
			oModel.read("/ZP2M_CDS_C_QM_INSPLOT",{
				filters: aFilter,
				sorters: aSorters,
				success: function (oData, oResponse) {
					for (var i = 0; i < oData.results.length; i++) {
						aJsonData.push(oData.results[i]);
						aJsonData[i].Status = formatter.StatusIdToText.call(that, aJsonData[i].Status);
					}
						oSettings = {
					workbook: {
						columns: aCols,
						hierarchyLevel: 'Level'
					},
					dataSource: aJsonData,
					fileName: "InspectionLots.xlsx",
					showProgress: true
				};
	
				oSheet = new Spreadsheet(oSettings);
				oSheet.build().finally(function() {
					MessageToast.show("Table exported");
					oSheet.destroy();
				});
			},
			error: function(oError){
			}
			});
			

			
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		onUpdateStarted: function (oEvent) {
			// todo need to get filter and add this and check for double filter for active filter
			var oBinding = oEvent.getSource().getBinding("items");
			if(oBinding.aFilters.length === 0)
				oBinding.filter([new Filter("IsActiveEntity", FilterOperator.EQ, true)]);
		},
		
		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function () {
			history.go(-1);
		},

		onSearch: function (oEvent) {
			var oAppStateModel = this.getView().getModel("appState");
			if(oAppStateModel.getProperty("/UserSelection/ValidityStartDate/ValidityStartDateState") === "Error" || oAppStateModel.getProperty("/UserSelection/DeadlineDate/DeadlineDateState") === "Error"){
				return;	
			}
			
			var aFilter = [];
			var	oTable = this.byId("InspectionLotTable");
			if(!this.ColumListItemTemplate)
				this.ColumListItemTemplate = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.ColumListItemTemplate", this);
			oTable.bindItems({
				path : "/ZP2M_CDS_C_QM_INSPLOT",
				template : this.ColumListItemTemplate,
				templateShareable : true
			});
			
			
			var oBinding = oTable.getBinding("items");
			aFilter.push(new Filter("IsActiveEntity", FilterOperator.EQ, true));
			if(oAppStateModel.getProperty("/UserSelection/InsctionLotNo/InsctionLotNoValue") !== "")
				aFilter.push(new Filter("InspectionLotNR", FilterOperator.Contains, oAppStateModel.getProperty("/UserSelection/InsctionLotNo/InsctionLotNoValue")));
			if (oAppStateModel.getProperty("/UserSelection/ValidityStartDate/ValidityStartDateValue")) {
				var firstDateValue = oAppStateModel.getProperty("/UserSelection/ValidityStartDate/ValidityStartDateValue");
				var secondDateValue = oAppStateModel.getProperty("/UserSelection/ValidityStartDate/ValidityStartDateSecondValue");
				aFilter.push(new Filter("EarliestSaleDate", FilterOperator.BT, this.getNewDate(firstDateValue), this.getNewDate(secondDateValue)));
			}
			if (oAppStateModel.getProperty("/UserSelection/DeadlineDate/DeadlineDateValue")) {
				var firstDateValue = oAppStateModel.getProperty("/UserSelection/DeadlineDate/DeadlineDateValue");
				var secondDateValue = oAppStateModel.getProperty("/UserSelection/DeadlineDate/DeadlineDateSecondValue");
				aFilter.push(new Filter("Deadline", FilterOperator.BT, this.getNewDate(firstDateValue), this.getNewDate(secondDateValue)));
			}
			if(oAppStateModel.getProperty("/UserSelection/TestLabId/TestLabIdValue") !== "")
				aFilter.push(new Filter("TestLabID", FilterOperator.Contains, oAppStateModel.getProperty("/UserSelection/TestLabId/TestLabIdValue")));
			if(oAppStateModel.getProperty("/UserSelection/MaterialValueHelp/MaterialKey") !== "")
				aFilter.push(new Filter("Material", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/MaterialValueHelp/MaterialKey")));
			if(oAppStateModel.getProperty("/UserSelection/PlantValueHelp/PlantKey") !== "")
				aFilter.push(new Filter("Plant", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/PlantValueHelp/PlantKey")));
			if(oAppStateModel.getProperty("/UserSelection/VendorValueHelp/VendorKey") !== "")
				aFilter.push(new Filter("Vendor", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/VendorValueHelp/VendorKey")));
			if(oAppStateModel.getProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrpKey") !== "")
				aFilter.push(new Filter("CommodityGroup", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrpKey")));
			if(oAppStateModel.getProperty("/UserSelection/Status/StatusValue") !== "")
				aFilter.push(new Filter("Status", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/Status/StatusValue")));
			if(oAppStateModel.getProperty("/UserSelection/InspectionType/InspectionTypeValue") !== "")
				aFilter.push(new Filter("InspectionType", FilterOperator.EQ, oAppStateModel.getProperty("/UserSelection/InspectionType/InspectionTypeValue")));
			oBinding.filter(aFilter);
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getSource().getBindingContext().getProperty("InspectionLotNR")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		onVendorValueHelpRequest: function (oEvent) {
			if (!this._oVendorValueHelpDialog) {
				this._oVendorValueHelpDialog = sap.ui.xmlfragment(
					"com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.VendorValueHelp", this);
				this.getView().addDependent(this._oVendorValueHelpDialog);
				this._oVendorValueHelpDialog.open();
			} else {
				this._oVendorValueHelpDialog.open();
			}
		},

		onMaterialValueHelpRequest: function () {
			if (!this._oMaterialValueHelpDialog) {
				this._oMaterialValueHelpDialog = sap.ui.xmlfragment(
					"com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.MaterialValueHelp", this);
				this.getView().addDependent(this._oMaterialValueHelpDialog);
				this._oMaterialValueHelpDialog.open();
			} else {
				this._oMaterialValueHelpDialog.open();
			}
		},

		onPlantValueHelpRequest: function () {
			if (!this._oPlantValueHelpDialog) {
				this._oPlantValueHelpDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.PlantValueHelp",
					this);
				this.getView().addDependent(this._oPlantValueHelpDialog);
				this._oPlantValueHelpDialog.open();
			} else {
				this._oPlantValueHelpDialog.open();
			}
		},

		onCommodityGrpValueHelpRequest: function () {
			if (!this._oCommodityGrpValueHelpDialog) {
				this._oCommodityGrpValueHelpDialog = sap.ui.xmlfragment(
					"com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.CommodityGrpValueHelp", this);
				this.getView().addDependent(this._oCommodityGrpValueHelpDialog);
				this._oCommodityGrpValueHelpDialog.open();
			} else {
				this._oCommodityGrpValueHelpDialog.open();
			}
		},
 
		_handleValueHelpClose: function (oEvent) {
			var sInputPath = oEvent.getSource().data("inputModelPath"),
				oSelectedItem = oEvent.getSource().getSelectedItem(),
				oAppState = this.getView().getModel("appState"),
				oModel = this.getView().getModel();
			if (oSelectedItem && oSelectedItem.getBindingContextPath()) {
				var oData = oModel.getData(oSelectedItem.getBindingContextPath());
				switch (sInputPath) {
				case "/UserSelection/PlantValueHelp":
					oAppState.setProperty("/UserSelection/PlantValueHelp/PlantKey", oData.Plant);
					oAppState.setProperty("/UserSelection/PlantValueHelp/Plant", oData.PlantDesc);
					this._oPlantValueHelpDialog.close();
					break;
				case "/UserSelection/VendorValueHelp":
					oAppState.setProperty("/UserSelection/VendorValueHelp/VendorKey", oData.Vendor);
					oAppState.setProperty("/UserSelection/VendorValueHelp/Vendor", oData.VendorName);
					this._oVendorValueHelpDialog.close();
					break;
				case "/UserSelection/CommodityGrpValueHelp":
					oAppState.setProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrpKey", oData.CommodityGroup);
					oAppState.setProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrp", oData.CommodityGroupDesc);
					this._oCommodityGrpValueHelpDialog.close();
					break;
				case "/UserSelection/MaterialValueHelp":
					oAppState.setProperty("/UserSelection/MaterialValueHelp/MaterialKey", oData.Material);
					oAppState.setProperty("/UserSelection/MaterialValueHelp/Material", oData.MaterialName);
					this._oMaterialValueHelpDialog.close();
					break;
				}
			}
		},
		
		handleValuehelpSearch: function (oEvent) {
			var sValue = oEvent.getSource().getValue();			
			var sInputPath = oEvent.getSource().data("inputModelPath");
			var oFilter;
			var aFilter = [];
			var andFilter = [];
			var	oTable = oEvent.getSource().getParent().getParent(); //to change
			switch (sInputPath) {
			case "/UserSelection/MaterialValueHelp":
				aFilter.push(new Filter("Material", FilterOperator.Contains, sValue));
				aFilter.push(new Filter("MaterialName", FilterOperator.Contains, sValue));
				oFilter = new Filter({
					filters: aFilter,
					and: false
				});
				break;
			case "/UserSelection/VendorValueHelp":
				aFilter.push(new Filter("Vendor", FilterOperator.Contains, sValue));
				aFilter.push(new Filter("VendorName", FilterOperator.Contains, sValue));
				oFilter = new Filter({
					filters: aFilter,
					and: false
				});
				break;
			case "/UserSelection/PlantValueHelp":
				aFilter.push(new Filter("Plant", FilterOperator.Contains, sValue));
				aFilter.push(new Filter("PlantDesc", FilterOperator.Contains, sValue));
				andFilter.push(new sap.ui.model.Filter(aFilter, false));
				oFilter = new Filter({
					filters: andFilter,
					and: true
				});
				break;
			case "/UserSelection/CommodityGrpValueHelp":
				aFilter.push(new Filter("CommodityGroup", FilterOperator.Contains, sValue));
				aFilter.push(new Filter("CommodityGroupDesc", FilterOperator.Contains, sValue));
				oFilter = new Filter({
					filters: aFilter,
					and: false
				});
				break;
			}
			
			var oBinding = oTable.getBinding("items");
			oBinding.filter(oFilter);
		},
		
		onVendorSort: function () {
			if (!this._oVendorSortDialog1) {
				this._oVendorSortDialog1 = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.VendorViewSettings", this);
				this.getView().addDependent(this._oVendorSortDialog1);
				this._oVendorSortDialog1.open();
			} else {
				this._oVendorSortDialog1.open();
			}
		},
		
		onPlantSort: function () {
			if (!this._oPlantSortDialog) {
				this._oPlantSortDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.PlantViewSettings", this);
				this.getView().addDependent(this._oPlantSortDialog);
				this._oPlantSortDialog.open();
			} else {
				this._oPlantSortDialog.open();
			}
		},
		
		onMaterialSort: function () {
			if (!this._oMaterialSortDialog) {
				this._oMaterialSortDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.MaterialViewSettings", this);
				this.getView().addDependent(this._oMaterialSortDialog);
				this._oMaterialSortDialog.open();
			} else {
				this._oMaterialSortDialog.open();
			}
		},
		
		onCommodityGrpSort: function () {
			if (!this._oCommodityGrpSortDialog) {
				this._oCommodityGrpSortDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.CommodityGrpViewSettings", this);
				this.getView().addDependent(this._oCommodityGrpSortDialog);
				this._oCommodityGrpSortDialog.open();
			} else {
				this._oCommodityGrpSortDialog.open();
			}
		},
		
		handleVendorSettingsConfrim: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idTableVendorSelect"), 
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath = mParams.sortItem.getKey(),
				bDescending = mParams.sortDescending,
				aSorters = [];
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},
		
		handlePlantSettingsConfrim: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idTablePlantSelect"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath = mParams.sortItem.getKey(),
				bDescending = mParams.sortDescending,
				aSorters = [];
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},
		
		handleMaterialSettingsConfrim: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idTableMaterialSelect"), 
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath = mParams.sortItem.getKey(),
				bDescending = mParams.sortDescending,
				aSorters = [];
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},
		
		handleCommodityGrpSettingsConfrim: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idTableCommodityGrpSelect"), 
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath = mParams.sortItem.getKey(),
				bDescending = mParams.sortDescending,
				aSorters = [];
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},
		
		onCancelValueHelp: function (oEvent) {
			var oValueHelpDialog = oEvent.getSource().getParent();
			oValueHelpDialog.close();
		},
		
		onClearValueHelp: function(oEvent){
			var oValueHelpDialog = oEvent.getSource().getParent();
			var oTable = oValueHelpDialog.getContent()[0];
			var sInputPath = oTable.data("inputModelPath");
			oTable.getHeaderToolbar().getContent()[2].setValue();
			var oBinding = oTable.getBinding("items");
			oBinding.sort([]);
			oBinding.filter([]);
			this._clearValuehelpValue(sInputPath);
			
		},
		
		_clearValuehelpValue: function(sInputPath){
			var oAppState = this.getModel("appState");
			switch (sInputPath) {
				case "/UserSelection/PlantValueHelp":
					oAppState.setProperty("/UserSelection/PlantValueHelp/PlantKey", "");
					oAppState.setProperty("/UserSelection/PlantValueHelp/Plant", "");
					this._oPlantValueHelpDialog.close();
					break;
				case "/UserSelection/VendorValueHelp":
					oAppState.setProperty("/UserSelection/VendorValueHelp/VendorKey", "");
					oAppState.setProperty("/UserSelection/VendorValueHelp/Vendor", "");
					this._oVendorValueHelpDialog.close();
					break;
				case "/UserSelection/CommodityGrpValueHelp":
					oAppState.setProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrpKey", "");
					oAppState.setProperty("/UserSelection/CommodityGrpValueHelp/CommodityGrp", "");
					this._oCommodityGrpValueHelpDialog.close();
					break;
				case "/UserSelection/MaterialValueHelp":
					oAppState.setProperty("/UserSelection/MaterialValueHelp/MaterialKey", "");
					oAppState.setProperty("/UserSelection/MaterialValueHelp/Material", "");
					this._oMaterialValueHelpDialog.close();
					break;
				}
				
		},

		onDateChange: function (oEvent) {
			var bValid = oEvent.getParameter("valid");
			if (bValid) {
				this.getView().getModel("appState").setProperty("/UserSelection/ValidityStartDate/ValidityStartDateState", "None");
			} else {
				this.getView().getModel("appState").setProperty("/UserSelection/ValidityStartDate/ValidityStartDateState", "Error");
			}
		},
		
		onDeadlineDateChange: function (oEvent) {
			var bValid = oEvent.getParameter("valid");
			if (bValid) {
				this.getView().getModel("appState").setProperty("/UserSelection/DeadlineDate/DeadlineDateState", "None");
			} else {
				this.getView().getModel("appState").setProperty("/UserSelection/DeadlineDate/DeadlineDateState", "Error");
			}
		},
		
		onSort: function () {
			if (!this._oSortDialog) {
				this._oSortDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.ViewSettings", this);
				this.getView().addDependent(this._oSortDialog);
			} 
			this._oSortDialog.open("sort");
		},
		
		onGroup: function () {
			if (!this._oSortDialog) {
				this._oSortDialog = sap.ui.xmlfragment("com.sap.aldi.cr221-qm-external-record-inspection.view.fragments.ViewSettings", this);
				this.getView().addDependent(this._oSortDialog);
			} 
			this._oSortDialog.open("group");
		},

		handleSettingsConfrim: function (oEvent) {
			var oTable = this.byId("InspectionLotTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				vGroup,
				aSorters = [];
				
			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				vGroup = this.mGroupFunctions[sPath];
				aSorters.push(new Sorter(sPath, bDescending, vGroup));
				// apply the selected group settings
			}
				
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
				// aSorters = [];
			aSorters.push(new Sorter(sPath, bDescending));
			if(oBinding !== undefined){
				oBinding.sort(aSorters);	
			}
		},
		
		getNewDate: function (sDate) {
			var dd = sDate.getDate();
			var mm = sDate.getMonth();
			var yyyy = sDate.getFullYear();

			if (dd < 10) {
				dd = "0" + dd;
			}

			if (mm < 10) {
				mm = "0" + mm;
			}
			
			var hh = sDate.getHours();
			var min = sDate.getMinutes();
			var ss = sDate.getSeconds();

			if (hh < 10) {
				hh = "0" + hh;
			}

			if (min < 10) {
				min = "0" + min;
			}

			if (ss < 10) {
				ss = "0" + ss;
			}

			 return Date.UTC(yyyy, mm, dd, hh, min, ss)
		},


	});
});