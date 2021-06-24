import React, { useCallback, useEffect, useState } from 'react';
import {
  array as YupArray,
  string as YupString,
  boolean as YupBoolean,
} from 'yup';
import _get from 'lodash.get';
import { node } from 'prop-types';
import { Form, useFormikContext } from 'formik';

import { __ } from '../../../i18n';
import { _toString } from '../../../utils';
import { CART_SHIPPING_ADDRESS } from '../utility';
import { SHIPPING_ADDR_FORM } from '../../../config';
import LocalStorage from '../../../utils/localStorage';
import useFormSection from '../../../hook/useFormSection';
import useFormEditMode from '../../../hook/useFormEditMode';
import { isCartAddressValid } from '../../../utils/address';
import { customerHasAddress } from '../../../utils/customer';
import useRegionData from '../../address/hooks/useRegionData';
import useSaveAddressAction from '../hooks/useSaveAddressAction';
import useEnterActionInForm from '../../../hook/useEnterActionInForm';
import ShippingAddressFormContext from '../context/ShippingAddressFormikContext';
import useShippingAddressAppContext from '../hooks/useShippingAddressAppContext';
import useShippingAddressCartContext from '../hooks/useShippingAddressCartContext';

const initialValues = {
  company: '',
  firstname: '',
  lastname: '',
  street: [''],
  phone: '',
  zipcode: '',
  city: '',
  region: '',
  country: '',
};

const requiredMessage = __('%1 is required');

const validationSchema = {
  company: YupString().required(requiredMessage),
  firstname: YupString().required(requiredMessage),
  lastname: YupString().required(requiredMessage),
  street: YupArray().test(
    'street1Required',
    requiredMessage,
    value => !!_get(value, 0)
  ),
  phone: YupString().required(requiredMessage),
  zipcode: YupString().required(requiredMessage),
  city: YupString().required(requiredMessage),
  region: YupString()
    .required(requiredMessage)
    .nullable(),
  country: YupString().required(requiredMessage),
  isSameAsShipping: YupBoolean(),
};

const toggleRegionRequiredSchema = regionRequired => {
  if (!regionRequired && validationSchema.region) {
    validationSchema.region = YupString().nullable();
  } else {
    validationSchema.region = YupString()
      .required(requiredMessage)
      .nullable();
  }
};

const countryField = `${SHIPPING_ADDR_FORM}.country`;

function ShippingAddressFormikProvider({ children }) {
  const addressIdInCache = _toString(
    LocalStorage.getCustomerShippingAddressId()
  );
  const [backupAddress, setBackupAddress] = useState(null);
  const [forceViewMode, setForceViewMode] = useState(false);
  const [forceFilledAddress, setForceFilledAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(
    addressIdInCache || CART_SHIPPING_ADDRESS
  );
  const [customerAddressSelected, setCustomerAddressSelected] = useState(
    !!addressIdInCache
  );
  const editModeContext = useFormEditMode();
  const regionData = useRegionData(SHIPPING_ADDR_FORM);
  const { cartShippingAddress } = useShippingAddressCartContext();
  const { values, setFieldValue, setFieldTouched } = useFormikContext();
  const { countryList, customerAddressList } = useShippingAddressAppContext();
  const { setFormToViewMode } = editModeContext;
  const countryValue = _get(values, countryField);
  const cartHasShippingAddress = isCartAddressValid(cartShippingAddress);

  const resetShippingAddressFormFields = useCallback(() => {
    setFieldValue(SHIPPING_ADDR_FORM, { ...initialValues });
    setFieldTouched(SHIPPING_ADDR_FORM, {});
  }, [setFieldValue, setFieldTouched]);

  const setShippingAddressFormFields = useCallback(
    addressToSet => {
      setFieldValue(SHIPPING_ADDR_FORM, {
        ...initialValues,
        ...addressToSet,
      });
    },
    [setFieldValue]
  );

  // filling shipping address field when the cart possess a shipping address
  useEffect(() => {
    if (forceFilledAddress === selectedAddress || !cartHasShippingAddress) {
      return;
    }

    setShippingAddressFormFields({ ...cartShippingAddress });
    setForceFilledAddress(selectedAddress);
  }, [
    selectedAddress,
    forceFilledAddress,
    cartShippingAddress,
    cartHasShippingAddress,
    setShippingAddressFormFields,
  ]);

  // when user sign-in, if the cart has shipping address, then we need to
  // turn off edit mode of the address section
  useEffect(() => {
    if (
      !forceViewMode &&
      (cartHasShippingAddress || customerHasAddress(customerAddressList))
    ) {
      // this needs to be executed once. to make sure that we are using
      // forceViewMode state
      setFormToViewMode();
      setForceViewMode(true);
    }
  }, [
    forceViewMode,
    setFormToViewMode,
    customerAddressList,
    cartHasShippingAddress,
  ]);

  // whenever country value changed, we will find the country entry from the countryList
  // so that we can toggle the validation on the `region` field
  useEffect(() => {
    if (countryList && countryValue) {
      const regionRequired = !!countryList.find(
        country => country.id === countryValue
      )?.state_required;

      toggleRegionRequiredSchema(regionRequired);
    }
  }, [countryValue, countryList]);

  let context = {
    ...regionData,
    ...editModeContext,
    backupAddress,
    selectedAddress,
    setBackupAddress,
    setSelectedAddress,
    customerAddressSelected,
    setCustomerAddressSelected,
    setShippingAddressFormFields,
    resetShippingAddressFormFields,
  };

  const formSubmit = useSaveAddressAction(context);

  const handleKeyDown = useEnterActionInForm({
    validationSchema,
    submitHandler: formSubmit,
    formId: SHIPPING_ADDR_FORM,
  });

  const formSectionContext = useFormSection({
    initialValues,
    validationSchema,
    id: SHIPPING_ADDR_FORM,
    submitHandler: formSubmit,
  });

  context = { ...context, ...formSectionContext, formSubmit, handleKeyDown };

  return (
    <ShippingAddressFormContext.Provider value={context}>
      <Form id={SHIPPING_ADDR_FORM}>{children}</Form>
    </ShippingAddressFormContext.Provider>
  );
}

ShippingAddressFormikProvider.propTypes = {
  children: node.isRequired,
};

export default ShippingAddressFormikProvider;
